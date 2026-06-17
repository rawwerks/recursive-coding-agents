#!/usr/bin/env node
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import net from 'node:net';
import process from 'node:process';

const host = '127.0.0.1';
const chromiumBin = process.env.CHROMIUM_BIN ?? 'chromium';
const scratchRoot = path.join(homedir(), 'scratch', 'recursive-coding-agents-talk', 'visual-qa');

function fail(message) {
	throw new Error(`Slide layout assertion failed: ${message}`);
}

function delay(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function fetchWithTimeout(url, timeoutMs = 5_000) {
	return fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
}

function waitForExit(child, timeoutMs = 1000) {
	if (child.exitCode !== null || child.signalCode !== null) return Promise.resolve();

	return new Promise((resolve) => {
		const timeout = setTimeout(() => {
			child.kill('SIGKILL');
			resolve();
		}, timeoutMs);

		child.once('exit', () => {
			clearTimeout(timeout);
			resolve();
		});
	});
}

async function rmWithRetry(target) {
	for (let attempt = 0; attempt < 5; attempt++) {
		try {
			await rm(target, { recursive: true, force: true });
			return;
		} catch (error) {
			if (attempt === 4) throw error;
			await delay(100);
		}
	}
}

function getFreePort() {
	return new Promise((resolve, reject) => {
		const server = net.createServer();
		server.unref();
		server.on('error', reject);
		server.listen(0, host, () => {
			const address = server.address();
			server.close(() => {
				if (!address || typeof address === 'string') reject(new Error('Could not allocate a port.'));
				else resolve(address.port);
			});
		});
	});
}

async function waitForHttp(url, label, output) {
	for (let attempt = 0; attempt < 80; attempt++) {
		try {
			const response = await fetchWithTimeout(url, 1_000);
			if (response.ok) return response;
		} catch {
			// The server/browser may still be booting.
		}
		await delay(100);
	}

	fail(`${label} did not become ready.\n${output()}`);
}

async function assertStaticLayoutContract() {
	let sources;
	try {
		sources = await Promise.all([
			readFile('src/app.css', 'utf8'),
			readFile('src/lib/Slide.svelte', 'utf8'),
			readFile('src/routes/+page.svelte', 'utf8')
		]);
	} catch (error) {
		fail(`Could not read layout source files: ${error instanceof Error ? error.message : String(error)}`);
	}
	const [appCss, slideSvelte, pageSvelte] = sources;
	const combined = sources.join('\n');

	if (/--maxw-(wide|code)\b/.test(combined)) {
		fail('Use only --maxw for slide content width; --maxw-wide/--maxw-code are forbidden.');
	}

	const slideMaxWidths = [...slideSvelte.matchAll(/max-width\s*:\s*([^;]+);/g)].map((match) =>
		match[1].trim()
	);
	if (slideMaxWidths.length !== 1 || slideMaxWidths[0] !== 'var(--maxw)') {
		fail(
			`src/lib/Slide.svelte must have exactly one .content max-width: var(--maxw); found ${JSON.stringify(slideMaxWidths)}.`
		);
	}

	if (/\.slide\[data-variant[^{]*\.content[^{]*\{[\s\S]*?max-width\s*:/m.test(slideSvelte)) {
		fail('Slide variants must not override .content max-width.');
	}

	if (!/--maxw:\s*min\(/.test(appCss)) {
		fail('src/app.css must define the single responsive --maxw token.');
	}

	if (/:global\(\.slide\s+\.content\)\s*\{[\s\S]*?max-width\s*:/m.test(pageSvelte)) {
		fail('src/routes/+page.svelte must not override slide .content max-width.');
	}
}

async function startVite() {
	const port = await getFreePort();
	const url = `http://${host}:${port}`;
	const output = [];
	const server = spawn(
		'bun',
		['run', 'dev', '--', '--host', host, '--port', String(port), '--strictPort'],
		{
			cwd: process.cwd(),
			env: { ...process.env, BROWSER: 'none' },
			stdio: ['ignore', 'pipe', 'pipe']
		}
	);

	server.stdout.on('data', (chunk) => output.push(chunk.toString()));
	server.stderr.on('data', (chunk) => output.push(chunk.toString()));
	server.on('exit', (code, signal) => {
		if (code !== null && code !== 0) output.push(`Vite exited with code ${code}.\n`);
		if (signal) output.push(`Vite exited from signal ${signal}.\n`);
	});

	await waitForHttp(url, 'Vite', () => output.join(''));
	return {
		url,
		stop: () => server.kill('SIGTERM'),
		output: () => output.join('')
	};
}

async function startChromium(url) {
	const port = await getFreePort();
	await mkdir(scratchRoot, { recursive: true });
	const profile = await mkdtemp(path.join(scratchRoot, 'chromium-profile-'));
	const browser = spawn(
		chromiumBin,
		[
			'--headless',
			'--disable-gpu',
			'--no-sandbox',
			'--window-size=1440,900',
			`--remote-debugging-port=${port}`,
			`--user-data-dir=${profile}`,
			url
		],
		{ stdio: 'ignore' }
	);

	await waitForHttp(`http://${host}:${port}/json`, 'Chromium CDP', () => '');
	const pages = await (await fetchWithTimeout(`http://${host}:${port}/json`)).json();
	const page = pages.find((entry) => entry.type === 'page') ?? pages[0];
	if (!page?.webSocketDebuggerUrl) fail('Chromium did not expose a page websocket.');

	return {
		page,
		stop: async () => {
			browser.kill('SIGTERM');
			await waitForExit(browser);
			await rmWithRetry(profile);
		}
	};
}

async function evaluateInPage(page, viewport, expression) {
	const ws = new WebSocket(page.webSocketDebuggerUrl);
	let nextId = 1;
	const pending = new Map();

	const onMessage = (event) => {
		let message;
		try {
			message = JSON.parse(event.data);
		} catch (error) {
			for (const { reject } of pending.values()) {
				reject(error instanceof Error ? error : new Error(String(error)));
			}
			pending.clear();
			return;
		}

		if (!message.id || !pending.has(message.id)) return;
		const { resolve, reject } = pending.get(message.id);
		pending.delete(message.id);
		message.error ? reject(new Error(message.error.message)) : resolve(message.result);
	};

	ws.onmessage = onMessage;

	try {
		await new Promise((resolve, reject) => {
			const cleanup = () => {
				ws.onopen = null;
				ws.onerror = null;
			};
			ws.onopen = () => {
				cleanup();
				resolve();
			};
			ws.onerror = () => {
				cleanup();
				reject(new Error('Could not connect to Chromium page websocket.'));
			};
		});

		function send(method, params = {}) {
			const id = nextId++;
			ws.send(JSON.stringify({ id, method, params }));
			return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
		}

		await send('Runtime.enable');
		await send('Page.enable');
		await send('Emulation.setDeviceMetricsOverride', {
			width: viewport.width,
			height: viewport.height,
			deviceScaleFactor: 1,
			mobile: viewport.width < 760
		});
		async function evaluateWithReloadRetry(params, attempts = 4) {
			for (let attempt = 0; attempt < attempts; attempt++) {
				try {
					return await send('Runtime.evaluate', params);
				} catch (error) {
					const message = error instanceof Error ? error.message : String(error);
					if (!/Execution context was destroyed|Cannot find context|Inspected target navigated/i.test(message)) {
						throw error;
					}
					if (attempt === attempts - 1) throw error;
					await delay(500);
				}
			}
		}

		await evaluateWithReloadRetry({
			expression: `new Promise((resolve) => {
				const deadline = performance.now() + 8000;
				const tick = () => {
					if (document.readyState !== 'loading' && document.querySelector('.slide')) {
						resolve(true);
						return;
					}
					if (performance.now() > deadline) {
						resolve(false);
						return;
					}
					requestAnimationFrame(tick);
				};
				tick();
			})`,
			awaitPromise: true,
			returnByValue: true
		});
		await delay(150);

		const result = await evaluateWithReloadRetry({
			expression,
			awaitPromise: true,
			returnByValue: true
		});
		if (result.exceptionDetails) fail(result.exceptionDetails.text ?? 'Browser evaluation failed.');
		return result.result.value;
	} finally {
		ws.onmessage = null;
		ws.close();
	}
}

async function probeBenchmarkCarouselTouchSwipe(page) {
	const ws = new WebSocket(page.webSocketDebuggerUrl);
	let nextId = 1;
	const pending = new Map();

	const onMessage = (event) => {
		let message;
		try {
			message = JSON.parse(event.data);
		} catch (error) {
			for (const { reject } of pending.values()) {
				reject(error instanceof Error ? error : new Error(String(error)));
			}
			pending.clear();
			return;
		}

		if (!message.id || !pending.has(message.id)) return;
		const { resolve, reject } = pending.get(message.id);
		pending.delete(message.id);
		message.error ? reject(new Error(message.error.message)) : resolve(message.result);
	};

	ws.onmessage = onMessage;

	try {
		await new Promise((resolve, reject) => {
			const cleanup = () => {
				ws.onopen = null;
				ws.onerror = null;
			};
			ws.onopen = () => {
				cleanup();
				resolve();
			};
			ws.onerror = () => {
				cleanup();
				reject(new Error('Could not connect to Chromium page websocket.'));
			};
		});

		function send(method, params = {}) {
			const id = nextId++;
			ws.send(JSON.stringify({ id, method, params }));
			return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
		}

		async function evaluate(expression) {
			const result = await send('Runtime.evaluate', {
				expression,
				awaitPromise: true,
				returnByValue: true
			});
			if (result.exceptionDetails) fail(result.exceptionDetails.text ?? 'Browser evaluation failed.');
			return result.result.value;
		}

		await send('Runtime.enable');
		await send('Page.enable');
		await send('Emulation.setDeviceMetricsOverride', {
			width: 390,
			height: 844,
			deviceScaleFactor: 1,
			mobile: true
		});
		await evaluate(`new Promise((resolve) => {
			const deadline = performance.now() + 8000;
			const tick = () => {
				if (document.readyState !== 'loading' && document.querySelector('.slide')) {
					resolve(true);
					return;
				}
				if (performance.now() > deadline) {
					resolve(false);
					return;
				}
				requestAnimationFrame(tick);
			};
			tick();
		})`);
		await delay(150);

		const setup = await evaluate(`((async () => {
			const deck = document.querySelector('.deck');
			const slide = Array.from(document.querySelectorAll('.slide')).find(
				(candidate) => candidate.getAttribute('data-label')?.toLowerCase() === 'too hot to benchmark'
			);
			if (!deck || !slide) return { error: 'Benchmark carousel slide did not render.' };
			deck.style.scrollBehavior = 'auto';
			deck.scrollTop = slide.offsetTop;
			await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

			const carousel = slide.querySelector('[data-benchmark-tweets]');
			if (!carousel) return { error: 'Benchmark carousel did not render inside the target slide.' };
			carousel.querySelector('.benchmark-tweets__dot')?.click();
			await new Promise((resolve) => setTimeout(resolve, 700));

			const link = carousel.querySelector('.benchmark-tweets__link');
			const track = carousel.querySelector('.benchmark-tweets__track');
			if (!link || !track) return { error: 'Benchmark carousel track/link did not render.' };
			const linkRect = link.getBoundingClientRect();
			return {
				active: Array.from(carousel.querySelectorAll('.benchmark-tweets__dot')).findIndex((dot) =>
					dot.classList.contains('active')
				),
				scrollLeft: Math.round(track.scrollLeft),
				startX: Math.round(linkRect.left + linkRect.width * 0.82),
				endX: Math.round(linkRect.left + linkRect.width * 0.18),
				y: Math.round(linkRect.top + linkRect.height * 0.52),
				linkRect: {
					left: Math.round(linkRect.left),
					right: Math.round(linkRect.right),
					top: Math.round(linkRect.top),
					bottom: Math.round(linkRect.bottom)
				}
			};
		})())`);
		if (setup.error) return setup;
		if (setup.active !== 0) {
			return { error: 'Benchmark carousel swipe test could not reset to the first post.', setup };
		}

		const steps = 9;
		const touchPoint = (index) => ({
			x: Math.round(setup.startX + ((setup.endX - setup.startX) * index) / steps),
			y: setup.y + (index % 2),
			id: 1,
			radiusX: 4,
			radiusY: 4,
			force: 1
		});
		await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [touchPoint(0)] });
		for (let step = 1; step <= steps; step++) {
			await send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [touchPoint(step)] });
			await delay(30);
		}
		await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
		await delay(900);

		const after = await evaluate(`(() => {
			const carousel = document.querySelector('[data-benchmark-tweets]');
			const track = carousel?.querySelector('.benchmark-tweets__track');
			if (!carousel || !track) return { error: 'Benchmark carousel disappeared after touch swipe.' };
			return {
				active: Array.from(carousel.querySelectorAll('.benchmark-tweets__dot')).findIndex((dot) =>
					dot.classList.contains('active')
				),
				scrollLeft: Math.round(track.scrollLeft),
				clientWidth: track.clientWidth,
				scrollWidth: track.scrollWidth
			};
		})()`);
		if (after.error) return after;
		if (after.active !== 1 || after.scrollLeft <= setup.scrollLeft + 100) {
			return {
				error: 'Benchmark carousel did not respond to a left touch swipe.',
				before: setup,
				after
			};
		}

		return { before: setup, after };
	} finally {
		ws.onmessage = null;
		ws.close();
	}
}

function assertUnifiedWidths(caseName, result) {
	if (result.error) fail(`${caseName}: ${result.error}`);

	const widths = result.items.map((item) => item.width);
	const min = Math.min(...widths);
	const max = Math.max(...widths);
	if (max - min > 1) {
		const detail = result.items
			.map((item) => `${item.id} ${item.label} [${item.variant}]: ${item.width}px`)
			.join('\n');
		fail(`${caseName}: slide .content widths drifted by ${(max - min).toFixed(2)}px.\n${detail}`);
	}

	const overflowing = result.items.filter((item) => item.horizontalOverflow);
	if (overflowing.length > 0) {
		const detail = overflowing
			.map((item) => `${item.id} ${item.label}: left ${item.left}px, right ${item.right}px`)
			.join('\n');
		fail(`${caseName}: slide content overflows horizontally.\n${detail}`);
	}

	const verticalOverflowing = result.items.filter((item) => item.verticalOverflow);
	if (verticalOverflowing.length > 0) {
		const detail = verticalOverflowing
			.map(
				(item) =>
					`${item.id} ${item.label}: slide ${item.slideHeight}px, content ${item.contentHeight}px, viewport ${item.viewportHeight}px`
			)
			.join('\n');
		fail(`${caseName}: slide content exceeds the viewport vertically.\n${detail}`);
	}

	if (!result.dotRail) fail(`${caseName}: slide dot rail was not measurable.`);
	if (result.dotRail.centerDrift > 1.5) {
		fail(`${caseName}: slide dot rail is not vertically centered.\n${JSON.stringify(result.dotRail, null, 2)}`);
	}
	if (result.dotRail.visualLeft < result.dotRail.contentRight + 2) {
		fail(
			`${caseName}: slide dot visuals overlap the content column.\n${JSON.stringify(result.dotRail, null, 2)}`
		);
	}
	if (result.dotRail.visualRightGap < 2) {
		fail(
			`${caseName}: slide dot visuals are clipped by the viewport edge.\n${JSON.stringify(result.dotRail, null, 2)}`
		);
	}
}

function assertTakeawaysPretext(caseName, result) {
	if (result.error) fail(`${caseName}: ${result.error}`);
	if (result.ready !== 'true') fail(`${caseName}: takeaways Pretext measurement did not become ready.`);
	if (result.rows.length !== 3) {
		fail(`${caseName}: expected 3 measured takeaways rows; found ${result.rows.length}.`);
	}

	const unmeasured = result.rows.filter(
		(row) =>
			row.titleLines === null ||
			row.bodyLines === null ||
			row.measuredHeight === null ||
			row.titleLines < 1 ||
			row.bodyLines < 1 ||
			row.measuredHeight <= 0
	);
	if (unmeasured.length > 0) {
		fail(`${caseName}: takeaways rows are missing Pretext metrics.\n${JSON.stringify(unmeasured, null, 2)}`);
	}

	if (result.proofHeightVar === null) fail(`${caseName}: missing --ftw-pretext-proof-height.`);
	const proofDrift = Math.abs(result.proofHeightVar - result.proofHeight);
	if (proofDrift > 14) {
		fail(
			`${caseName}: Pretext proof height differs from rendered proof height by ${proofDrift.toFixed(2)}px.\n${JSON.stringify(result, null, 2)}`
		);
	}

	const rowDrifts = result.rows
		.map((row, index) => ({
			index: index + 1,
			drift: Math.abs(row.measuredHeight - row.height),
			measuredHeight: row.measuredHeight,
			height: row.height
		}))
		.filter((row) => row.drift > 14);
	if (rowDrifts.length > 0) {
		fail(`${caseName}: Pretext row heights drift from rendered rows.\n${JSON.stringify(rowDrifts, null, 2)}`);
	}

	if (caseName === 'desktop') {
		const offCenterRows = result.rows.filter((row) => row.centerDrift > 2);
		if (offCenterRows.length > 0) {
			fail(
				`${caseName}: takeaways title/body text boxes are not center-aligned.\n${JSON.stringify(offCenterRows, null, 2)}`
			);
		}

		const drift = Math.abs(result.lockupHeight - result.proofHeight);
		if (drift > 2) {
			fail(
				`${caseName}: Pretext-aligned takeaways columns drifted by ${drift.toFixed(2)}px.\n${JSON.stringify(result, null, 2)}`
			);
		}
	}
}

function assertAlignmentAudit(caseName, result) {
	if (result.error) fail(`${caseName}: ${result.error}`);
	if (result.failures.length > 0) {
		fail(
			`${caseName}: mathematical slide alignment audit failed.\n${JSON.stringify(result.failures, null, 2)}`
		);
	}
}

function assertPretextTextAudit(caseName, result) {
	if (result.error) fail(`${caseName}: ${result.error}`);
	if (result.failures.length > 0) {
		fail(`${caseName}: Pretext text audit failed.\n${JSON.stringify(result.failures, null, 2)}`);
	}
	if (result.measured.length < 18) {
		fail(
			`${caseName}: Pretext text audit measured too few elements (${result.measured.length}).\n${JSON.stringify(result, null, 2)}`
		);
	}
}

function assertOutcomesProgression(caseName, result) {
	const progression = result.outcomesProgression;
	if (!progression) fail(`${caseName}: outcomes progression image was not measurable.`);
	if (progression.centerDrift > 2) {
		fail(`${caseName}: outcomes progression image is not centered.\n${JSON.stringify(progression, null, 2)}`);
	}
	if (progression.bottomGap < 42 || progression.bottomGap > Math.max(170, progression.viewportHeight * 0.2)) {
		fail(
			`${caseName}: outcomes progression image is not anchored in the bottom zone.\n${JSON.stringify(progression, null, 2)}`
		);
	}
	if (progression.textGap < 28) {
		fail(`${caseName}: outcomes progression image crowds the text.\n${JSON.stringify(progression, null, 2)}`);
	}
	if (progression.width < Math.min(260, progression.viewportWidth * 0.62)) {
		fail(`${caseName}: outcomes progression image rendered too small.\n${JSON.stringify(progression, null, 2)}`);
	}
}

function assertNoImageTextOverlap(caseName, result) {
	if (!result.imageTextOverlaps) fail(`${caseName}: image/text overlap audit did not run.`);
	if (result.imageTextOverlaps.length > 0) {
		fail(
			`${caseName}: images overlap visible text.\n${JSON.stringify(result.imageTextOverlaps, null, 2)}`
		);
	}
}

function assertSourceFooters(caseName, result) {
	if (!result.sourceFooterIssues) fail(`${caseName}: source footer audit did not run.`);
	if (result.sourceFooterIssues.length > 0) {
		fail(
			`${caseName}: source footer placement failed.\n${JSON.stringify(result.sourceFooterIssues, null, 2)}`
		);
	}
}

await assertStaticLayoutContract();

let vite;
let chromium;

try {
	vite = await startVite();
	chromium = await startChromium(`${vite.url}/`);

	const layoutExpression = `((async () => {
		await document.fonts?.ready;
		await Promise.all(
			Array.from(document.images).map((img) => {
				if (img.complete) return true;
				return new Promise((resolve) => {
					img.addEventListener('load', resolve, { once: true });
					img.addEventListener('error', resolve, { once: true });
				});
			})
		);
		const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
		const dotDeadline = performance.now() + 4000;
		while (!document.querySelector('.dots .dot-visual') && performance.now() < dotDeadline) {
			await delay(50);
		}

		const slides = Array.from(document.querySelectorAll('.slide'));
		if (slides.length === 0) return { error: 'No slides rendered.', items: [] };
		const contentRects = slides
			.map((slide) => slide.querySelector(':scope > .content')?.getBoundingClientRect())
			.filter(Boolean);
		const dotRail = document.querySelector('.dots');
		const dotRailRect = dotRail?.getBoundingClientRect();
		const dotVisualRects = Array.from(document.querySelectorAll('.dot-visual')).map((dot) =>
			dot.getBoundingClientRect()
		);
		const dotVisualLeft = Math.min(...dotVisualRects.map((rect) => rect.left));
		const dotVisualRight = Math.max(...dotVisualRects.map((rect) => rect.right));
		const visibleRect = (element) => {
			const style = getComputedStyle(element);
			if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) {
				return null;
			}
			const r = element.getBoundingClientRect();
			if (r.width <= 0 || r.height <= 0) return null;
			return r;
		};
		const textSelector = [
			'h1',
			'h2',
			'h3',
			'p',
			'li',
			'a:not(:has(img))',
			'strong',
			'em',
			'span',
			'code',
			'pre'
		].join(',');
		const imageTextOverlaps = [];
		const sourceFooterIssues = [];
		for (const slide of slides) {
			const images = Array.from(slide.querySelectorAll('.content img'))
				.map((element) => ({ element, rect: visibleRect(element) }))
				.filter((item) => item.rect);
			const textElements = Array.from(slide.querySelectorAll(\`.content \${textSelector}\`))
				.filter((element) => {
					if (element.querySelector('img')) return false;
					if (!element.textContent?.trim()) return false;
					if (element.closest('.dots, .next-slide-cue')) return false;
					return true;
				})
				.map((element) => ({ element, rect: visibleRect(element) }))
				.filter((item) => item.rect);

			for (const image of images) {
				for (const text of textElements) {
					const xOverlap =
						Math.min(image.rect.right, text.rect.right) - Math.max(image.rect.left, text.rect.left);
					const yOverlap =
						Math.min(image.rect.bottom, text.rect.bottom) - Math.max(image.rect.top, text.rect.top);
					if (xOverlap > 1 && yOverlap > 1) {
						imageTextOverlaps.push({
							slide: slide.id,
							label: slide.getAttribute('data-label') ?? '',
							imageClass: image.element.className || image.element.parentElement?.className || '',
							text: text.element.textContent.trim().replace(/\\s+/g, ' ').slice(0, 90),
							xOverlap: Number(xOverlap.toFixed(2)),
							yOverlap: Number(yOverlap.toFixed(2)),
							image: {
								left: Number(image.rect.left.toFixed(2)),
								top: Number(image.rect.top.toFixed(2)),
								right: Number(image.rect.right.toFixed(2)),
								bottom: Number(image.rect.bottom.toFixed(2))
							},
							textRect: {
								left: Number(text.rect.left.toFixed(2)),
								top: Number(text.rect.top.toFixed(2)),
								right: Number(text.rect.right.toFixed(2)),
								bottom: Number(text.rect.bottom.toFixed(2))
							}
						});
					}
				}
			}

			const footer = slide.querySelector(':scope > .source-footer');
			const slideRect = slide.getBoundingClientRect();
			if (!footer) {
				sourceFooterIssues.push({
					slide: slide.id,
					label: slide.getAttribute('data-label') ?? '',
					reason: 'missing source footer'
				});
			} else {
				const footerRect = visibleRect(footer);
				if (!footerRect) {
					sourceFooterIssues.push({
						slide: slide.id,
						label: slide.getAttribute('data-label') ?? '',
						reason: 'source footer is not visible'
					});
				} else {
					const centerDrift = Math.abs(footerRect.left + footerRect.width / 2 - window.innerWidth / 2);
					const bottomGap = slideRect.bottom - footerRect.bottom;
					if (centerDrift > 2 || bottomGap < 3 || bottomGap > 28) {
						sourceFooterIssues.push({
							slide: slide.id,
							label: slide.getAttribute('data-label') ?? '',
							reason: 'source footer is not centered in the bottom zone',
							centerDrift: Number(centerDrift.toFixed(2)),
							bottomGap: Number(bottomGap.toFixed(2))
						});
					}

					const contentElements = Array.from(
						slide.querySelectorAll(\`.content \${textSelector}, .content img\`)
					)
						.filter((element) => {
							if (element.querySelector?.('img')) return false;
							if (element.matches('img')) return true;
							return Boolean(element.textContent?.trim());
						})
						.map((element) => ({ element, rect: visibleRect(element) }))
						.filter((item) => item.rect);

					for (const item of contentElements) {
						const xOverlap =
							Math.min(footerRect.right, item.rect.right) - Math.max(footerRect.left, item.rect.left);
						const yOverlap =
							Math.min(footerRect.bottom, item.rect.bottom) - Math.max(footerRect.top, item.rect.top);
						if (xOverlap > 1 && yOverlap > 1) {
							sourceFooterIssues.push({
								slide: slide.id,
								label: slide.getAttribute('data-label') ?? '',
								reason: 'source footer overlaps slide content',
								text: item.element.matches('img')
									? item.element.getAttribute('src')
									: item.element.textContent.trim().replace(/\\s+/g, ' ').slice(0, 90),
								xOverlap: Number(xOverlap.toFixed(2)),
								yOverlap: Number(yOverlap.toFixed(2))
							});
						}
					}
				}
			}
		}
		const outcomesSlide = slides.find(
			(slide) => slide.getAttribute('data-label') === 'We all want outcomes'
		);
		const progression = outcomesSlide?.querySelector('.outcomes-progression img');
		const progressionFigure = outcomesSlide?.querySelector('.outcomes-progression');
		const progressionRect = progression?.getBoundingClientRect();
		const progressionFigureRect = progressionFigure?.getBoundingClientRect();
		const outcomesSlideRect = outcomesSlide?.getBoundingClientRect();
		const textRects = outcomesSlide
			? Array.from(outcomesSlide.querySelectorAll('.outcomes-copy > *'))
					.map((element) => element.getBoundingClientRect())
					.filter((rect) => rect.width > 0 && rect.height > 0)
			: [];
		const textBottom = textRects.length ? Math.max(...textRects.map((rect) => rect.bottom)) : null;

		return {
			imageTextOverlaps,
			sourceFooterIssues,
			outcomesProgression:
				progressionRect && progressionFigureRect && outcomesSlideRect && textBottom !== null
					? {
							centerDrift: Number(
								Math.abs(
									progressionRect.left +
										progressionRect.width / 2 -
										(outcomesSlideRect.left + outcomesSlideRect.width / 2)
								).toFixed(2)
							),
							bottomGap: Number((outcomesSlideRect.bottom - progressionRect.bottom).toFixed(2)),
							textGap: Number((progressionFigureRect.top - textBottom).toFixed(2)),
							width: Number(progressionRect.width.toFixed(2)),
							height: Number(progressionRect.height.toFixed(2)),
							viewportWidth: window.innerWidth,
							viewportHeight: window.innerHeight
						}
					: null,
			dotRail:
				dotRailRect && dotVisualRects.length > 0 && contentRects.length > 0
					? {
							top: Number(dotRailRect.top.toFixed(2)),
							bottom: Number(dotRailRect.bottom.toFixed(2)),
							height: Number(dotRailRect.height.toFixed(2)),
							centerDrift: Number(
								Math.abs(dotRailRect.top + dotRailRect.height / 2 - window.innerHeight / 2).toFixed(2)
							),
							visualLeft: Number(dotVisualLeft.toFixed(2)),
							visualRight: Number(dotVisualRight.toFixed(2)),
							visualRightGap: Number((window.innerWidth - dotVisualRight).toFixed(2)),
							contentRight: Number(Math.max(...contentRects.map((rect) => rect.right)).toFixed(2)),
							viewportWidth: window.innerWidth
						}
					: null,
			items: slides.map((slide) => {
				const content = slide.querySelector(':scope > .content');
				if (!content) {
					return {
						id: slide.id,
						label: slide.getAttribute('data-label') ?? '',
						variant: slide.getAttribute('data-variant') ?? '',
						width: 0,
						left: 0,
						right: 0,
						horizontalOverflow: true
					};
				}

				const contentRect = content.getBoundingClientRect();
				const slideRect = slide.getBoundingClientRect();
				return {
					id: slide.id,
					label: slide.getAttribute('data-label') ?? '',
					variant: slide.getAttribute('data-variant') ?? '',
					width: Number(contentRect.width.toFixed(2)),
					contentHeight: Number(contentRect.height.toFixed(2)),
					slideHeight: Math.ceil(slide.scrollHeight),
					viewportHeight: window.innerHeight,
					left: Number(contentRect.left.toFixed(2)),
					right: Number(contentRect.right.toFixed(2)),
					horizontalOverflow:
						contentRect.left < slideRect.left - 1 || contentRect.right > slideRect.right + 1,
					verticalOverflow: slide.scrollHeight > window.innerHeight + 2
				};
			})
		};
	})())`;

	for (const viewport of [
		{ name: 'desktop', width: 1440, height: 900 },
		{ name: 'wide-desktop', width: 2092, height: 1100 },
		{ name: 'short-desktop', width: 1366, height: 768 },
		{ name: 'short-wide-desktop', width: 1280, height: 720 },
		{ name: 'mobile', width: 390, height: 844 },
		{ name: 'narrow-mobile', width: 360, height: 740 }
	]) {
		const result = await evaluateInPage(chromium.page, viewport, layoutExpression);
		assertUnifiedWidths(viewport.name, result);
		assertNoImageTextOverlap(viewport.name, result);
		assertSourceFooters(viewport.name, result);
		assertOutcomesProgression(viewport.name, result);
		console.log(
			`${viewport.name} slide layout assertions passed (${result.items.length} slides, width ${result.items[0].width}px).`
		);

		const takeawaysPretextExpression = `((async () => {
			await document.fonts?.ready;

			const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
			const panel = document.querySelector('.ftw-takeaways');
			if (!panel) return { error: 'Takeaways panel did not render.' };
			if (panel.getAttribute('data-pretext-unsupported')) {
				return { error: 'Pretext unsupported: ' + panel.getAttribute('data-pretext-unsupported') };
			}

			const deadline = performance.now() + 4000;
			while (performance.now() < deadline && panel.getAttribute('data-pretext-ready') !== 'true') {
				await delay(50);
			}

			const lockup = panel.querySelector('.ftw-lockup');
			const proof = panel.querySelector('.ftw-proof');
			if (!lockup || !proof) return { error: 'Takeaways lockup/proof elements are missing.' };

			const numberAttr = (element, name) => {
				const value = element.getAttribute(name);
				return value === null ? null : Number(value);
			};

			return {
				ready: panel.getAttribute('data-pretext-ready'),
				lockupHeight: Number(lockup.getBoundingClientRect().height.toFixed(2)),
				proofHeight: Number(proof.getBoundingClientRect().height.toFixed(2)),
				proofHeightVar:
					Number.parseFloat(getComputedStyle(panel).getPropertyValue('--ftw-pretext-proof-height')) ||
					null,
				rows: Array.from(panel.querySelectorAll('.ftw-proof-row')).map((row) => {
					const title = row.querySelector('.ftw-proof-title');
					const body = row.querySelector('.ftw-proof-body');
					const titleRect = title?.getBoundingClientRect();
					const bodyRect = body?.getBoundingClientRect();
					return {
						height: Number(row.getBoundingClientRect().height.toFixed(2)),
						measuredHeight:
							Number.parseFloat(getComputedStyle(row).getPropertyValue('--ftw-row-measured-height')) ||
							null,
						centerDrift:
							titleRect && bodyRect
								? Number(
										Math.abs(
											titleRect.top +
												titleRect.height / 2 -
												(bodyRect.top + bodyRect.height / 2)
										).toFixed(2)
									)
								: null,
						titleLines: numberAttr(row, 'data-pretext-title-lines'),
						bodyLines: numberAttr(row, 'data-pretext-body-lines'),
						titleHeight: numberAttr(row, 'data-pretext-title-height'),
						bodyHeight: numberAttr(row, 'data-pretext-body-height')
					};
				})
			};
		})())`;
		const takeawaysPretextResult = await evaluateInPage(
			chromium.page,
			viewport,
			takeawaysPretextExpression
		);
		assertTakeawaysPretext(viewport.name, takeawaysPretextResult);
		console.log(`${viewport.name} takeaways Pretext assertions passed.`);

		const alignmentAuditExpression = `((async () => {
			await document.fonts?.ready;
			await Promise.all(
				Array.from(document.images).map((img) => {
					if (img.complete) return true;
					return new Promise((resolve) => {
						img.addEventListener('load', resolve, { once: true });
						img.addEventListener('error', resolve, { once: true });
					});
				})
			);

			const failures = [];
			const checked = [];
			const desktop = innerWidth > 760;
			const rect = (element) => {
				const r = element.getBoundingClientRect();
				return {
					left: Number(r.left.toFixed(2)),
					top: Number(r.top.toFixed(2)),
					right: Number(r.right.toFixed(2)),
					bottom: Number(r.bottom.toFixed(2)),
					width: Number(r.width.toFixed(2)),
					height: Number(r.height.toFixed(2)),
					centerX: Number((r.left + r.width / 2).toFixed(2)),
					centerY: Number((r.top + r.height / 2).toFixed(2))
				};
			};
			const visible = (element) => {
				const r = element.getBoundingClientRect();
				return r.width > 0 && r.height > 0;
			};
			const push = (rule, message, data = {}) => failures.push({ rule, message, ...data });
			const near = (a, b, tolerance) => Math.abs(a - b) <= tolerance;
			const sameHorizontalEdges = (rule, a, b, tolerance = 2) => {
				const ar = rect(a);
				const br = rect(b);
				if (!near(ar.left, br.left, tolerance) || !near(ar.right, br.right, tolerance)) {
					push(rule, 'horizontal edges differ', { a: ar, b: br });
				}
			};
			const orderedVertically = (rule, elements, minGap = 0) => {
				const rs = elements.map(rect);
				for (let i = 1; i < rs.length; i++) {
					if (rs[i].top < rs[i - 1].bottom + minGap - 1) {
						push(rule, 'elements are not stacked in order', { previous: rs[i - 1], current: rs[i] });
					}
				}
			};
			const sameHeightTopBottom = (rule, elements, tolerance = 4) => {
				const rs = elements.map(rect);
				for (let i = 1; i < rs.length; i++) {
					if (
						!near(rs[0].top, rs[i].top, 2) ||
						!near(rs[0].bottom, rs[i].bottom, tolerance) ||
						!near(rs[0].height, rs[i].height, tolerance)
					) {
						push(rule, 'items are not top/bottom/height aligned', { first: rs[0], current: rs[i] });
					}
				}
			};
			const sameWidthLeftRight = (rule, elements, tolerance = 2) => {
				const rs = elements.map(rect);
				for (let i = 1; i < rs.length; i++) {
					if (
						!near(rs[0].left, rs[i].left, tolerance) ||
						!near(rs[0].right, rs[i].right, tolerance) ||
						!near(rs[0].width, rs[i].width, tolerance)
					) {
						push(rule, 'items do not share horizontal edges/width', { first: rs[0], current: rs[i] });
					}
				}
			};
			const desktopPairOrMobileStack = (rule, container, itemSelector, { centerY = true } = {}) => {
				const items = Array.from(container.querySelectorAll(itemSelector)).filter(visible);
				checked.push({ rule, count: items.length });
				if (items.length < 2) return;
				if (desktop) {
					const [a, b] = items;
					const ar = rect(a);
					const br = rect(b);
					if (centerY && !near(ar.centerY, br.centerY, 4)) {
						push(rule, 'desktop pair is not vertically center-aligned', { a: ar, b: br });
					}
				} else {
					sameHorizontalEdges(rule, items[0], items[1]);
					orderedVertically(rule, items, 8);
				}
			};

			for (const slide of document.querySelectorAll('.slide')) {
				const content = slide.querySelector(':scope > .content');
				if (!content) {
					push('slide-content', 'slide is missing direct .content', { slide: slide.id });
					continue;
				}
				const slideRect = rect(slide);
				const contentRect = rect(content);
				checked.push({ rule: 'slide-content-centered', slide: slide.id });
				if (!near(slideRect.centerX, contentRect.centerX, 2)) {
					push('slide-content-centered', 'content is not horizontally centered in slide', {
						slide: slide.id,
						slideRect,
						contentRect
					});
				}
				if (contentRect.left < slideRect.left - 1 || contentRect.right > slideRect.right + 1) {
					push('slide-content-contained', 'content escapes slide horizontally', {
						slide: slide.id,
						slideRect,
						contentRect
					});
				}
				for (const element of content.querySelectorAll('*')) {
					if (!(element instanceof HTMLElement) || !visible(element)) continue;
					const style = getComputedStyle(element);
					if (style.position === 'fixed') continue;
					const intentionalHorizontalScroll =
						element.classList.contains('benchmark-tweets') ||
						element.classList.contains('benchmark-tweets__track');
					if (!intentionalHorizontalScroll && element.scrollWidth > element.clientWidth + 2) {
						push('internal-horizontal-overflow', 'element has clipped horizontal overflow', {
							slide: slide.id,
							className: element.className,
							tagName: element.tagName,
							clientWidth: element.clientWidth,
							scrollWidth: element.scrollWidth
						});
					}
					const elementRect = rect(element);
					if (
						!intentionalHorizontalScroll &&
						!element.closest('.benchmark-tweets__track') &&
						(elementRect.left < slideRect.left - 2 || elementRect.right > slideRect.right + 2)
					) {
						push('internal-horizontal-overflow', 'element escapes slide horizontal bounds', {
							slide: slide.id,
							className: element.className,
							tagName: element.tagName,
							slideRect,
							elementRect
						});
					}
				}
			}

			for (const split of document.querySelectorAll('.paper-split, .evidence-split')) {
				desktopPairOrMobileStack('split-layout', split, ':scope > *');
			}

			for (const previews of document.querySelectorAll('.url-previews, .repo-preview-grid')) {
				const items = Array.from(previews.children).filter(visible);
				checked.push({ rule: 'preview-grid', count: items.length });
				if (desktop && items.length >= 2) {
					sameHeightTopBottom('preview-grid', items, 4);
				} else if (!desktop && items.length >= 2) {
					sameWidthLeftRight('preview-mobile-stack', items);
					orderedVertically('preview-mobile-stack', items, 8);
				}
			}

			for (const list of document.querySelectorAll('.project-list, .applied-list')) {
				const rows = Array.from(list.children).filter(visible);
				checked.push({ rule: 'structured-list', count: rows.length });
				if (rows.length > 1) {
					sameWidthLeftRight('structured-list', rows);
					orderedVertically('structured-list', rows, 0);
				}
			}

			const rlmGrid = document.querySelector('[data-rlm-check-grid]');
			if (rlmGrid) {
				checked.push({ rule: 'rlm-check-grid' });
				const activePanel = rlmGrid.querySelector(
					desktop ? '.rlm-check-table' : '.rlm-check-cards'
				);
				if (!activePanel || !visible(activePanel)) {
					push('rlm-check-grid', 'expected active rubric layout is not visible', { desktop });
				} else if (activePanel.scrollWidth > activePanel.clientWidth + 2) {
					push('rlm-check-grid', 'active rubric layout has horizontal overflow', {
						clientWidth: activePanel.clientWidth,
						scrollWidth: activePanel.scrollWidth
					});
				}
				const rubricLink = rlmGrid.querySelector('.rlm-rubric-link');
				if (!rubricLink || !visible(rubricLink)) {
					push('rlm-rubric-link', 'RLM rubric link is missing or hidden');
				} else {
					const gridRect = rect(rlmGrid);
					const linkRect = rect(rubricLink);
					if (!rubricLink.href.includes('/recursive-coding-agents/blob/main/rlm-rubric/README.md')) {
						push('rlm-rubric-link', 'RLM rubric link targets the wrong URL', {
							href: rubricLink.href
						});
					}
					if (!near(gridRect.centerX, linkRect.centerX, 2)) {
						push('rlm-rubric-link', 'RLM rubric link is not centered under the grid', {
							grid: gridRect,
							link: linkRect
						});
					}
				}
			}

			for (const verdict of document.querySelectorAll('.verdict-compare')) {
				const rule = 'verdict-compare';
				const columns = Array.from(verdict.querySelectorAll('.verdict')).filter(visible);
				checked.push({ rule, count: columns.length });
				if (columns.length !== 2) {
					push(rule, 'expected exactly two verdict columns', { count: columns.length });
				} else if (desktop) {
					const [left, right] = columns.map(rect);
					if (!near(left.width, right.width, 2) || !near(left.height, right.height, 4)) {
						push(rule, 'desktop verdict columns are not equal sized', { left, right });
					}
					const parent = rect(verdict);
					if (!near((left.centerX + right.centerX) / 2, parent.centerX, 2)) {
						push(rule, 'verdict columns are not symmetric around parent center', {
							parent,
							left,
							right
						});
					}
					for (const column of columns) {
						const cr = rect(column);
						for (const child of column.querySelectorAll('.verdict-call, .verdict-tweet, .verdict-when')) {
							const childRect = rect(child);
							if (!near(childRect.centerX, cr.centerX, 2)) {
								push('verdict-column-center', 'verdict child is not centered in its column', {
									rule,
									column: cr,
									child: childRect,
									className: child.className
								});
							}
						}
					}
				} else {
					const [left, right] = columns.map(rect);
					const parent = rect(verdict);
					if (!near((left.centerX + right.centerX) / 2, parent.centerX, 2)) {
						push('verdict-mobile-pair', 'mobile verdict columns are not symmetric around parent center', {
							rule,
							parent,
							left,
							right
						});
					}
					if (!near(left.width, right.width, 2)) {
						push('verdict-mobile-pair', 'mobile verdict columns are not equal width', {
							rule,
							left,
							right
						});
					}
					if (!near(left.centerY, right.centerY, 3)) {
						push('verdict-mobile-pair', 'mobile verdict columns are not vertically center-aligned', {
							left,
							right
						});
					}
					const tweetFrames = columns.map((column) => column.querySelector('.verdict-tweet')).filter(Boolean);
					const whens = columns.map((column) => column.querySelector('.verdict-when')).filter(Boolean);
					if (tweetFrames.length === 2) {
						const [a, b] = tweetFrames.map(rect);
						if (!near(a.top, b.top, 2) || !near(a.bottom, b.bottom, 2) || !near(a.height, b.height, 2)) {
							push('verdict-mobile-tweet-frames', 'mobile verdict tweet frames are not equal-height/aligned', {
								a,
								b
							});
						}
					}
					if (whens.length === 2) {
						const [a, b] = whens.map(rect);
						if (!near(a.centerY, b.centerY, 2) || !near(a.bottom, b.bottom, 2)) {
							push('verdict-mobile-date-alignment', 'mobile verdict date captions are not aligned', {
								a,
								b
							});
						}
					}
				}
			}

			const benchmarkTweets = document.querySelector('[data-benchmark-tweets]');
			if (benchmarkTweets) {
				const track = benchmarkTweets.querySelector('.benchmark-tweets__track');
				const panels = Array.from(benchmarkTweets.querySelectorAll('.benchmark-tweets__panel')).filter(visible);
				const frames = Array.from(benchmarkTweets.querySelectorAll('.benchmark-tweets__link')).filter(visible);
				const dots = benchmarkTweets.querySelector('.benchmark-tweets__dots');
				const dotButtons = Array.from(
					benchmarkTweets.querySelectorAll('.benchmark-tweets__dot')
				).filter(visible);
				checked.push({ rule: 'benchmark-tweets-carousel', count: panels.length });
				if (!track || panels.length !== 2 || frames.length !== 2) {
					push('benchmark-tweets-carousel', 'benchmark carousel is missing expected panels', {
						panels: panels.length,
						frames: frames.length
					});
				} else if (desktop) {
					sameHeightTopBottom('benchmark-tweets-desktop', panels, 4);
					if (dots && visible(dots)) {
						push('benchmark-tweets-desktop', 'carousel dots should be hidden on desktop');
					}
				} else {
					const [firstPanel, secondPanel] = panels.map(rect);
					const [firstFrame, secondFrame] = frames.map(rect);
					if (track.scrollWidth <= track.clientWidth + 12) {
						push('benchmark-tweets-mobile-carousel', 'mobile benchmark carousel is not horizontally scrollable', {
							clientWidth: track.clientWidth,
							scrollWidth: track.scrollWidth
						});
					}
					if (
						!near(firstPanel.width, secondPanel.width, 2) ||
						!near(firstFrame.width, secondFrame.width, 2) ||
						!near(firstFrame.height, secondFrame.height, 2) ||
						secondPanel.left <= firstPanel.right
					) {
						push('benchmark-tweets-mobile-carousel', 'mobile benchmark tweet panels are not equal-sized carousel items', {
							firstPanel,
							secondPanel,
							firstFrame,
							secondFrame
						});
					}
					if (!dots || !visible(dots) || dotButtons.length !== 2) {
						push('benchmark-tweets-mobile-dots', 'mobile benchmark carousel must show two dot controls', {
							dotButtons: dotButtons.length
						});
					} else {
						const dotsRect = rect(dots);
						const parent = rect(benchmarkTweets);
						if (!near(dotsRect.centerX, parent.centerX, 2) || dotsRect.top < firstFrame.bottom - 1) {
							push('benchmark-tweets-mobile-dots', 'mobile benchmark carousel dots are not centered below the panel', {
								dots: dotsRect,
								parent,
								firstFrame
							});
						}
					}
				}
			}

			const workflow = document.querySelector('.workflow-showcase');
			if (workflow) {
				const copy = workflow.querySelector('.workflow-copy');
				const article = workflow.querySelector('.workflow-article');
				const examples = workflow.querySelector('.workflow-example-links');
				checked.push({ rule: 'workflow-showcase' });
				if (!copy || !article || !examples) {
					push('workflow-showcase', 'workflow showcase is missing expected regions');
				} else if (desktop) {
					const copyRect = rect(copy);
					const articleRect = rect(article);
					if (!near(copyRect.centerY, articleRect.centerY, 4)) {
						push('workflow-showcase', 'copy and article are not vertically center-aligned', {
							copy: copyRect,
							article: articleRect
						});
					}
					sameHorizontalEdges('workflow-examples-span', examples, workflow, 2);
					const cards = Array.from(examples.querySelectorAll('.url-preview')).filter(visible);
					if (cards.length === 2) {
						const [a, b] = cards.map(rect);
						if (!near(a.top, b.top, 2) || !near(a.bottom, b.bottom, 4) || !near(a.width, b.width, 2)) {
							push('workflow-example-cards', 'workflow example cards are not aligned/equal width', {
								a,
								b
							});
						}
					}
				} else {
					sameHorizontalEdges('workflow-mobile-stack', copy, article);
					sameHorizontalEdges('workflow-mobile-stack', article, examples);
					orderedVertically('workflow-mobile-stack', [copy, article, examples], 8);
				}
			}

			const bridge = document.querySelector('.bridge-quotes');
			if (bridge) {
				const quotes = Array.from(bridge.querySelectorAll('.bridge-quote')).filter(visible);
				const rule = bridge.querySelector('.bridge-rule');
				checked.push({ rule: 'bridge-quotes' });
				if (quotes.length === 2 && rule) {
					const first = rect(quotes[0]);
					const second = rect(quotes[1]);
					const ruleRect = rect(rule);
					const gapMidpoint = first.bottom + (second.top - first.bottom) / 2;
					if (!near(ruleRect.centerY, gapMidpoint, 2)) {
						push('bridge-quotes', 'bridge rule is not centered between quote boxes', {
							first,
							rule: ruleRect,
							second
						});
					}
				}
			}

			const bridgeTrees = document.querySelector('.bridge-tree-comparison');
			if (bridgeTrees) {
				const panels = Array.from(bridgeTrees.querySelectorAll('.bridge-tree-panel')).filter(visible);
				const trees = Array.from(bridgeTrees.querySelectorAll('.rlm-tree-example')).filter(visible);
				checked.push({ rule: 'bridge-tree-comparison', panels: panels.length, trees: trees.length });
				if (panels.length !== 2 || trees.length !== 2) {
					push('bridge-tree-comparison', 'bridge tree comparison is missing expected panels or trees');
				} else if (desktop) {
					const [leftPanel, rightPanel] = panels.map(rect);
					const [leftTree, rightTree] = trees.map(rect);
					if (!near(leftPanel.centerY, rightPanel.centerY, 3)) {
						push('bridge-tree-comparison', 'tree panels are not vertically center-aligned', {
							leftPanel,
							rightPanel
						});
					}
					if (!near(leftTree.top, rightTree.top, 3) || !near(leftTree.bottom, rightTree.bottom, 3)) {
						push('bridge-tree-comparison', 'tree text boxes are not vertically aligned', {
							leftTree,
							rightTree
						});
					}
				} else {
					orderedVertically('bridge-tree-comparison-mobile', panels, 6);
					sameHorizontalEdges('bridge-tree-comparison-mobile', panels[0], panels[1], 2);
				}
			}

			const proseProgramGrid = document.querySelector('.prose-program-grid');
			if (proseProgramGrid) {
				const cards = Array.from(proseProgramGrid.querySelectorAll('.prose-program')).filter(visible);
				checked.push({ rule: 'prose-program-grid', count: cards.length });
				if (desktop && cards.length === 2) {
					const [a, b] = cards.map(rect);
					if (!near(a.top, b.top, 2) || !near(a.bottom, b.bottom, 4) || !near(a.height, b.height, 4)) {
						push('prose-program-grid', 'desktop prose program cards are not equal-height/aligned', {
							a,
							b
						});
					}
				} else if (!desktop && cards.length === 2) {
					sameHorizontalEdges('prose-program-mobile-stack', cards[0], cards[1]);
					orderedVertically('prose-program-mobile-stack', cards, 8);
				}
			}

			return { checked, failures };
		})())`;
		const alignmentAuditResult = await evaluateInPage(chromium.page, viewport, alignmentAuditExpression);
		assertAlignmentAudit(viewport.name, alignmentAuditResult);
		console.log(
			`${viewport.name} mathematical alignment audit passed (${alignmentAuditResult.checked.length} rule groups).`
		);

		const pretextTextAuditExpression = `((async () => {
			await document.fonts?.ready;
			const pretext = await import('/node_modules/@chenglou/pretext/dist/layout.js');
			const failures = [];
			const measured = [];
			const skipped = [];
			const selectors = [
				{
					label: 'takeaways proof text',
					selector: '.ftw-proof-title, .ftw-proof-body',
					maxHeightDrift: 14,
					maxLineDrift: 0
				},
				{
					label: 'workflow card text',
					selector:
						'.workflow-example-links strong, .workflow-example-links .preview-source, .workflow-example-links .preview-note',
					maxHeightDrift: 14,
					maxLineDrift: 1
				},
				{
					label: 'OpenProse program text',
					selector: '.prose-program-label, .prose-program > strong, .prose-program-points li',
					maxHeightDrift: 14,
					maxLineDrift: 1,
					skipNestedInlineText: true
				},
				{
					label: 'repo description text',
					selector: '.repo-description',
					maxHeightDrift: 14,
					maxLineDrift: 1
				},
				{
					label: 'verdict date text',
					selector: '.verdict-when',
					maxHeightDrift: 8,
					maxLineDrift: 0
				}
			];
			const pxNumber = (value) => {
				const number = Number.parseFloat(value);
				return Number.isFinite(number) ? number : null;
			};
			const fontFamilyForCanvas = (fontFamily) => {
				if (!fontFamily || /\\bsystem-ui\\b/.test(fontFamily)) return 'Inter';
				return fontFamily;
			};
			const canvasFont = (style) =>
				\`\${style.fontStyle || 'normal'} \${style.fontWeight || '400'} \${style.fontSize || '16px'} \${fontFamilyForCanvas(style.fontFamily)}\`;
			const lineHeight = (style) => {
				const explicit = pxNumber(style.lineHeight);
				if (explicit !== null) return explicit;
				const fontSize = pxNumber(style.fontSize);
				return fontSize === null ? 16 * 1.2 : fontSize * 1.2;
			};
			const verticalBox = (style) =>
				(pxNumber(style.paddingTop) ?? 0) +
				(pxNumber(style.paddingBottom) ?? 0) +
				(pxNumber(style.borderTopWidth) ?? 0) +
				(pxNumber(style.borderBottomWidth) ?? 0);
			const horizontalBox = (style) =>
				(pxNumber(style.paddingLeft) ?? 0) +
				(pxNumber(style.paddingRight) ?? 0) +
				(pxNumber(style.borderLeftWidth) ?? 0) +
				(pxNumber(style.borderRightWidth) ?? 0);
			const actualLineCount = (element) => {
				const range = document.createRange();
				range.selectNodeContents(element);
				const tops = [];
				for (const rect of range.getClientRects()) {
					if (rect.width <= 0 || rect.height <= 0) continue;
					if (!tops.some((top) => Math.abs(top - rect.top) < 2)) tops.push(rect.top);
				}
				range.detach();
				return tops.length;
			};
			const hasMixedInlineText = (element) =>
				Array.from(element.querySelectorAll('*')).some((child) => child.textContent?.trim());
			const isUnsupportedWrap = (style) => /\\b(balance|pretty)\\b/.test(style.textWrap || '');

			for (const group of selectors) {
				for (const element of document.querySelectorAll(group.selector)) {
					const text = element.textContent?.replace(/\\s+/g, ' ').trim() ?? '';
					const rect = element.getBoundingClientRect();
					const style = getComputedStyle(element);
					if (!text || rect.width <= 0 || rect.height <= 0) {
						skipped.push({ label: group.label, reason: 'empty-or-hidden', text });
						continue;
					}
					if (isUnsupportedWrap(style)) {
						skipped.push({ label: group.label, reason: \`unsupported text-wrap: \${style.textWrap}\`, text });
						continue;
					}
					if (group.skipNestedInlineText && hasMixedInlineText(element)) {
						skipped.push({ label: group.label, reason: 'mixed nested inline text', text });
						continue;
					}

					const width = Math.max(1, (element.clientWidth || rect.width) - horizontalBox(style));
					const options = { whiteSpace: style.whiteSpace === 'pre-wrap' ? 'pre-wrap' : 'normal' };
					const prepared = pretext.prepare(text, canvasFont(style), options);
					const layout = pretext.layout(prepared, width, lineHeight(style));
					const renderedLines = actualLineCount(element);
					const renderedHeight = renderedLines * lineHeight(style);
					const elementHeight = rect.height - verticalBox(style);
					const heightDrift = Math.abs(layout.height - renderedHeight);
					const lineDrift = Math.abs(layout.lineCount - renderedLines);
					const item = {
						label: group.label,
						selector: group.selector,
						text,
						width: Number(width.toFixed(2)),
						pretextHeight: Number(layout.height.toFixed(2)),
						renderedHeight: Number(renderedHeight.toFixed(2)),
						elementHeight: Number(elementHeight.toFixed(2)),
						heightDrift: Number(heightDrift.toFixed(2)),
						pretextLines: layout.lineCount,
						renderedLines,
						lineDrift
					};
					measured.push(item);
					if (heightDrift > group.maxHeightDrift || lineDrift > group.maxLineDrift) {
						failures.push(item);
					}
				}
			}

			return { measured, skipped, failures };
		})())`;
		const pretextTextAuditResult = await evaluateInPage(
			chromium.page,
			viewport,
			pretextTextAuditExpression
		);
		assertPretextTextAudit(viewport.name, pretextTextAuditResult);
		console.log(
			`${viewport.name} Pretext text audit passed (${pretextTextAuditResult.measured.length} measured, ${pretextTextAuditResult.skipped.length} skipped).`
		);
	}

	const keyboardExpression = `((async () => {
		const deck = document.querySelector('.deck');
		const slides = Array.from(document.querySelectorAll('.slide'));
		if (!deck || slides.length < 10) {
			return { error: 'Deck must render at least 10 slides to test 0 -> slide 10.' };
		}

		const originalMatchMedia = window.matchMedia;
		const originalSetTimeout = window.setTimeout;
		window.setTimeout = (handler, timeout = 0, ...args) =>
			originalSetTimeout(handler, timeout >= 4900 ? 250 : timeout, ...args);
		window.matchMedia = (query) => {
			if (query.includes('prefers-reduced-motion')) {
				return {
					matches: true,
					media: query,
					onchange: null,
					addListener() {},
					removeListener() {},
					addEventListener() {},
					removeEventListener() {},
					dispatchEvent() {
						return false;
					}
				};
			}
			return originalMatchMedia.call(window, query);
		};

		const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
		const activeSlideId = () => document.querySelector('.dot.active')?.getAttribute('href')?.slice(1) ?? null;
		const topSlideId = () => {
			const deckTop = deck.getBoundingClientRect().top;
			return slides
				.map((slide) => ({
					id: slide.id,
					distance: Math.abs(slide.getBoundingClientRect().top - deckTop)
				}))
				.sort((a, b) => a.distance - b.distance)[0]?.id ?? null;
		};
		const waitForSlide = async (expected) => {
			const deadline = performance.now() + 2000;
			while (performance.now() < deadline) {
				if (activeSlideId() === expected || topSlideId() === expected) return true;
				await delay(50);
			}
			return false;
		};

		try {
			const checks = [
				['1', 'slide-1'],
				['2', 'slide-2'],
				['3', 'slide-3'],
				['4', 'slide-4'],
				['0', 'slide-10']
			];
			const results = [];
			for (const [key, expected] of checks) {
				const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
				window.dispatchEvent(event);
				const reached = await waitForSlide(expected);
				results.push({
					key,
					expected,
					reached,
					defaultPrevented: event.defaultPrevented,
					active: activeSlideId(),
					top: topSlideId()
				});
			}

			const failed = results.find((result) => !result.reached || !result.defaultPrevented);
			if (failed) {
				return {
					error: \`Number key \${failed.key} did not navigate to \${failed.expected}.\`,
					results
				};
			}

			return { results };
		} finally {
			window.matchMedia = originalMatchMedia;
			window.setTimeout = originalSetTimeout;
		}
	})())`;

	const keyboardResult = await evaluateInPage(
		chromium.page,
		{ name: 'desktop keyboard', width: 1440, height: 900 },
		keyboardExpression
	);
	if (keyboardResult.error) fail(`${keyboardResult.error}\n${JSON.stringify(keyboardResult.results, null, 2)}`);
	console.log('keyboard slide shortcuts passed (1-4 and 0 -> slide 10).');

	const scrollCueExpression = `((async () => {
		const deck = document.querySelector('.deck');
		const firstSlide = document.querySelector('#slide-1');
		const secondSlide = document.querySelector('#slide-2');
		const thirdSlide = document.querySelector('#slide-3');
		const lastSlide = document.querySelector('.slide:last-of-type');
		if (!deck || !firstSlide || !secondSlide || !thirdSlide || !lastSlide) {
			return { error: 'Deck must render first, second, third, and final slides for cue testing.' };
		}

		const originalMatchMedia = window.matchMedia;
		const originalSetTimeout = window.setTimeout;
		const scheduledCueDelays = [];
		window.setTimeout = (handler, timeout = 0, ...args) => {
			if (timeout === 5000 || timeout === 10000) scheduledCueDelays.push(timeout);
			return originalSetTimeout(handler, timeout >= 4900 ? 250 : timeout, ...args);
		};
		window.matchMedia = (query) => {
			if (query.includes('prefers-reduced-motion')) {
				return {
					matches: true,
					media: query,
					onchange: null,
					addListener() {},
					removeListener() {},
					addEventListener() {},
					removeEventListener() {},
					dispatchEvent() {
						return false;
					}
				};
			}
			return originalMatchMedia.call(window, query);
		};

		const delay = (ms) => new Promise((resolve) => originalSetTimeout(resolve, ms));
		const cue = () => document.querySelector('.next-slide-cue');
		const topSlideId = () => {
			const deckTop = deck.getBoundingClientRect().top;
			return Array.from(document.querySelectorAll('.slide'))
				.map((slide) => ({
					id: slide.id,
					distance: Math.abs(slide.getBoundingClientRect().top - deckTop)
				}))
				.sort((a, b) => a.distance - b.distance)[0]?.id ?? null;
		};
		const waitForSlide = async (expected) => {
			const deadline = performance.now() + 2000;
			while (performance.now() < deadline) {
				if (topSlideId() === expected) return true;
				await delay(50);
			}
			return false;
		};
		const waitForCueHref = async (href) => {
			const deadline = performance.now() + 1200;
			while (performance.now() < deadline) {
				if (cue()?.getAttribute('href') === href) return true;
				await delay(50);
			}
			return false;
		};
		const waitForVisibleCue = async (href) => {
			const deadline = performance.now() + 1600;
			while (performance.now() < deadline) {
				const currentCue = cue();
				if (currentCue?.getAttribute('href') === href) {
					const style = getComputedStyle(currentCue);
					if (Number(style.opacity) > 0.8 && style.pointerEvents !== 'none') return currentCue;
				}
				await delay(50);
			}
			return null;
		};

		try {
			deck.style.scrollBehavior = 'auto';
			deck.scrollTop = firstSlide.offsetTop;
			if (!(await waitForSlide('slide-1'))) {
				return { error: 'Cue test could not reset the deck to slide 1.', top: topSlideId() };
			}

			const firstCue = await waitForVisibleCue('#slide-2');
			if (!firstCue) {
				return { error: 'Deck must reveal a global .next-slide-cue after slide dwell time.' };
			}
			if (!scheduledCueDelays.includes(5000)) {
				return {
					error: 'First slide must schedule the next-slide cue after 5 seconds.',
					scheduledCueDelays
				};
			}
			if (!(await waitForCueHref('#slide-2'))) {
				return {
					error: 'First-slide cue did not retarget to slide 2 after the deck settled on slide 1.',
					top: topSlideId(),
					href: firstCue.getAttribute('href')
				};
			}
			if (firstCue.closest('.slide')) {
				return { error: 'Global next slide cue must not be nested inside a single slide.' };
			}
			if (firstCue.getAttribute('href') !== '#slide-2') {
				return {
					error: \`First-slide cue href must be #slide-2; found \${firstCue.getAttribute('href')}.\`
				};
			}
			window.dispatchEvent(new PointerEvent('pointermove', { clientX: window.innerWidth / 2, clientY: window.innerHeight / 2 }));
			await delay(120);
			const afterPointerMove = cue();
			if (!afterPointerMove || afterPointerMove.getAttribute('href') !== '#slide-2') {
				return {
					error: 'Pointer movement must not hide or retarget the next-slide cue.',
					href: afterPointerMove?.getAttribute('href') ?? null
				};
			}

			const cueStyle = getComputedStyle(firstCue);
			const cueRect = firstCue.getBoundingClientRect();
			const cueCenter = cueRect.left + cueRect.width / 2;
			const viewportCenter = window.innerWidth / 2;
			const centerDrift = Math.abs(cueCenter - viewportCenter);
			const bottomGap = Math.round(window.innerHeight - cueRect.bottom);
			if (
				cueStyle.opacity < 0.8 ||
				cueStyle.pointerEvents === 'none' ||
				centerDrift > 1.5 ||
				bottomGap < 8
			) {
				return {
					error: 'Global next slide cue must become visible after idle and stay bottom-centered.',
					opacity: cueStyle.opacity,
					pointerEvents: cueStyle.pointerEvents,
					centerDrift,
					bottomGap,
					cueRect: {
						left: Math.round(cueRect.left),
						right: Math.round(cueRect.right),
						bottom: Math.round(cueRect.bottom)
					}
				};
			}

			firstCue.click();
			const reached = await waitForSlide('slide-2');
			if (!reached) {
				return {
					error: 'Clicking global next slide cue must navigate the deck to slide 2.',
					top: topSlideId(),
					scrollTop: deck.scrollTop,
					slide2OffsetTop: secondSlide.offsetTop
				};
			}

			if (!(await waitForCueHref('#slide-3'))) {
				return {
					error: 'After reaching slide 2, global next slide cue must target slide 3.',
					top: topSlideId(),
					href: cue()?.getAttribute('href') ?? null
				};
			}

			const secondCue = await waitForVisibleCue('#slide-3');
			if (!secondCue) {
				return {
					error: 'Global next slide cue must render on slide 2 after dwell time.',
					top: topSlideId(),
					href: cue()?.getAttribute('href') ?? null
				};
			}
			if (!scheduledCueDelays.includes(10000)) {
				return {
					error: 'Non-first slides must schedule the next-slide cue after 10 seconds.',
					scheduledCueDelays
				};
			}

			deck.scrollTop = lastSlide.offsetTop;
			const reachedLast = await waitForSlide(lastSlide.id);
			await delay(350);
			if (!reachedLast || cue()) {
				return {
					error: 'Global next slide cue must disappear on the final slide.',
					top: topSlideId(),
					lastSlide: lastSlide.id,
					cueHref: cue()?.getAttribute('href') ?? null
				};
			}

			return { reached, top: topSlideId() };
		} finally {
			window.matchMedia = originalMatchMedia;
			window.setTimeout = originalSetTimeout;
		}
	})())`;

	const scrollCueResult = await evaluateInPage(
		chromium.page,
		{ name: 'desktop title cue', width: 1440, height: 900 },
		scrollCueExpression
	);
	if (scrollCueResult.error) fail(`${scrollCueResult.error}\n${JSON.stringify(scrollCueResult, null, 2)}`);
	console.log('global next slide cue passed (idle reveal, click advance, final-slide hide).');

	const benchmarkCarouselExpression = `((async () => {
		const deck = document.querySelector('.deck');
		const slide = Array.from(document.querySelectorAll('.slide')).find(
			(candidate) => candidate.getAttribute('data-label')?.toLowerCase() === 'too hot to benchmark'
		);
		if (!deck || !slide) {
			return { error: 'Benchmark carousel slide did not render.' };
		}

		const originalMatchMedia = window.matchMedia;
		window.matchMedia = (query) => {
			if (query.includes('prefers-reduced-motion')) {
				return {
					matches: false,
					media: query,
					onchange: null,
					addListener() {},
					removeListener() {},
					addEventListener() {},
					removeEventListener() {},
					dispatchEvent() {
						return false;
					}
				};
			}
			return originalMatchMedia.call(window, query);
		};

		const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
		deck.style.scrollBehavior = 'auto';
		deck.scrollTop = slide.offsetTop;
		let carousel = slide.querySelector('[data-benchmark-tweets]');
		const renderDeadline = performance.now() + 4000;
		while (!carousel && performance.now() < renderDeadline) {
			await delay(50);
			carousel = slide.querySelector('[data-benchmark-tweets]');
		}
		if (!carousel) {
			return { error: 'Benchmark carousel did not render inside the target slide.' };
		}

		const activeIndex = () =>
			Array.from(carousel.querySelectorAll('.benchmark-tweets__dot')).findIndex((dot) =>
				dot.classList.contains('active')
			);
		const visibleDots = () =>
			Array.from(carousel.querySelectorAll('.benchmark-tweets__dot')).filter((dot) => {
				const rect = dot.getBoundingClientRect();
				return rect.width > 0 && rect.height > 0;
			});

		try {
			carousel.querySelector('[data-benchmark-panel="0"]')?.scrollIntoView({
				behavior: 'auto',
				block: 'nearest',
				inline: 'center'
			});
			await delay(700);

			const dots = visibleDots();
			if (dots.length !== 2) {
				return { error: 'Mobile benchmark carousel must expose two visible dot controls.', dots: dots.length };
			}

			const start = activeIndex();
			if (start !== 0) {
				return { error: 'Benchmark carousel should start on the first post.', start };
			}

			const deadline = performance.now() + 6200;
			while (performance.now() < deadline) {
				if (activeIndex() === 1) {
					return { start, end: activeIndex() };
				}
				await delay(100);
			}

			return { error: 'Benchmark carousel did not auto-rotate to the second post.', start, end: activeIndex() };
		} finally {
			window.matchMedia = originalMatchMedia;
		}
	})())`;

	const benchmarkCarouselResult = await evaluateInPage(
		chromium.page,
		{ name: 'mobile benchmark carousel', width: 390, height: 844 },
		benchmarkCarouselExpression
	);
	if (benchmarkCarouselResult.error) {
		fail(`${benchmarkCarouselResult.error}\n${JSON.stringify(benchmarkCarouselResult, null, 2)}`);
	}
	console.log('mobile benchmark carousel passed (dots visible, auto-rotates).');

	const benchmarkSwipeResult = await probeBenchmarkCarouselTouchSwipe(chromium.page);
	if (benchmarkSwipeResult.error) {
		fail(`${benchmarkSwipeResult.error}\n${JSON.stringify(benchmarkSwipeResult, null, 2)}`);
	}
	console.log('mobile benchmark carousel swipe passed (touch drag advances posts).');
} finally {
	if (chromium) await chromium.stop();
	if (vite) {
		vite.stop();
		await delay(100);
	}
}

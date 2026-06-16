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

		const slides = Array.from(document.querySelectorAll('.slide'));
		if (slides.length === 0) return { error: 'No slides rendered.', items: [] };

		return {
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
					left: Number(contentRect.left.toFixed(2)),
					right: Number(contentRect.right.toFixed(2)),
					horizontalOverflow:
						contentRect.left < slideRect.left - 1 || contentRect.right > slideRect.right + 1
				};
			})
		};
	})())`;

	for (const viewport of [
		{ name: 'desktop', width: 1440, height: 900 },
		{ name: 'mobile', width: 390, height: 844 }
	]) {
		const result = await evaluateInPage(chromium.page, viewport, layoutExpression);
		assertUnifiedWidths(viewport.name, result);
		console.log(
			`${viewport.name} slide layout assertions passed (${result.items.length} slides, width ${result.items[0].width}px).`
		);
	}
} finally {
	if (chromium) await chromium.stop();
	if (vite) {
		vite.stop();
		await delay(100);
	}
}

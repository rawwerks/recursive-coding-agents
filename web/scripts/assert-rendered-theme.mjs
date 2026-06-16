#!/usr/bin/env node
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import net from 'node:net';
import process from 'node:process';

const host = '127.0.0.1';
const chromiumBin = process.env.CHROMIUM_BIN ?? 'chromium';

const expected = {
	dark: {
		background: 'oklch(0.1913 0 0)',
		primary: 'oklch(0.8520 0.0205 100.6306)',
		primaryForeground: 'oklch(0.3329 0 0)'
	},
	light: {
		background: 'oklch(0.9195 0.0169 88.0030)',
		primary: 'oklch(0.3012 0 0)',
		primaryForeground: 'oklch(0.9169 0.0175 99.6160)'
	}
};

function fail(message) {
	throw new Error(`Rendered theme assertion failed: ${message}`);
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
	const profile = await mkdtemp(path.join(tmpdir(), 'skps-rendered-theme-'));
	const browser = spawn(
		chromiumBin,
		[
			'--headless',
			'--disable-gpu',
			'--no-sandbox',
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

async function evaluateInPage(page, expression) {
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
		await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 1, y: 1, button: 'none' });
		await delay(500);
		const result = await send('Runtime.evaluate', {
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

function assertEqual(actual, expectedValue, label) {
	if (actual !== expectedValue) fail(`${label}: expected ${expectedValue}, got ${actual}`);
}

let vite;
let chromium;

try {
	vite = await startVite();

	const html = await (await fetchWithTimeout(vite.url)).text();
	if (!html.includes('id="active-shadcn-theme"')) fail('SSR HTML is missing active-shadcn-theme.');
	if (!html.includes(':root:root')) fail('SSR theme CSS is missing the high-specificity root selector.');
	if (!html.includes(':root.dark, .dark.dark')) {
		fail('SSR theme CSS is missing the high-specificity dark selector.');
	}

	chromium = await startChromium(`${vite.url}/#slide-1`);
	const result = await evaluateInPage(
		chromium.page,
		`(() => {
			const read = () => {
				const root = getComputedStyle(document.documentElement);
				const title = document.querySelector('#slide-1 h1');
				if (!title?.textContent?.includes('Recursive Coding Agents')) {
					return { error: 'Deck title not found.' };
				}

				const cta = document.querySelector('.cta');
				if (!cta) return { error: 'Deck CTA not found.' };

				const activeDot = document.querySelector('.dot.active .dot-visual');
				if (!activeDot) return { error: 'Active slide indicator not found.' };

				const titleStyle = getComputedStyle(title);
				const ctaStyle = getComputedStyle(cta);
				const dotStyle = getComputedStyle(activeDot);

				const normalizeColor = (cssValue) => {
					const probe = document.createElement('span');
					probe.style.color = cssValue;
					document.body.append(probe);
					const color = getComputedStyle(probe).color;
					probe.remove();
					return color;
				};

				return {
					background: root.getPropertyValue('--background').trim(),
					primary: root.getPropertyValue('--primary').trim(),
					primaryForeground: root.getPropertyValue('--primary-foreground').trim(),
					titleColor: titleStyle.color,
					ctaBackground: ctaStyle.backgroundColor,
					ctaColor: ctaStyle.color,
					activeDotBackground: dotStyle.backgroundColor,
					expectedForeground: normalizeColor('var(--foreground)'),
					expectedPrimary: normalizeColor('var(--primary)'),
					expectedPrimaryForeground: normalizeColor('var(--primary-foreground)')
				};
			};

			const waitForDeckEnhancement = () =>
				new Promise((resolve) => {
					let attempts = 0;
					const tick = () => {
						if (document.querySelector('.dot.active .dot-visual')) {
							resolve();
							return;
						}
						if (++attempts >= 40) {
							resolve();
							return;
						}
						setTimeout(tick, 100);
					};
					tick();
				});

			return new Promise((resolve) => {
				waitForDeckEnhancement().then(() => {
					const dark = read();
					document.documentElement.classList.remove('dark');
					setTimeout(() => resolve({ dark, light: read() }), 350);
				});
			});
		})()`
	);

	if (result.dark.error) fail(result.dark.error);
	if (result.light.error) fail(result.light.error);

	for (const mode of ['dark', 'light']) {
		assertEqual(result[mode].background, expected[mode].background, `${mode} background token`);
		assertEqual(result[mode].primary, expected[mode].primary, `${mode} primary token`);
		assertEqual(
			result[mode].primaryForeground,
			expected[mode].primaryForeground,
			`${mode} primary foreground token`
		);
		assertEqual(
			result[mode].titleColor,
			result[mode].expectedForeground,
			`${mode} deck title foreground`
		);
		assertEqual(
			result[mode].ctaBackground,
			result[mode].expectedPrimary,
			`${mode} deck CTA background`
		);
		assertEqual(
			result[mode].ctaColor,
			result[mode].expectedPrimaryForeground,
			`${mode} deck CTA foreground`
		);
		assertEqual(
			result[mode].activeDotBackground,
			result[mode].expectedPrimary,
			`${mode} active slide indicator background`
		);
		if (result[mode].ctaBackground === result[mode].ctaColor) {
			fail(`${mode} deck CTA background and foreground resolved to the same color.`);
		}
	}

	console.log('Rendered theme assertions passed.');
} catch (error) {
	console.error(error instanceof Error ? error.message : String(error));
	if (vite?.output) console.error(vite.output());
	process.exitCode = 1;
} finally {
	await chromium?.stop();
	vite?.stop();
}

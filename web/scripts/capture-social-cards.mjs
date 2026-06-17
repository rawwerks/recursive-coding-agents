#!/usr/bin/env node
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import net from 'node:net';

const host = '127.0.0.1';
const chromiumBin = process.env.CHROMIUM_BIN ?? 'chromium';
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(scriptDir, '..');
const scratchRoot = path.join(homedir(), 'scratch', 'recursive-coding-agents-talk', 'social-cards');
const cards = [
	{
		label: 'Open Graph',
		width: 1200,
		height: 630,
		output: path.join(webRoot, 'static', 'og-recursive-coding-agents.png')
	},
	{
		label: 'Twitter',
		width: 1200,
		height: 600,
		output: path.join(webRoot, 'static', 'twitter-recursive-coding-agents.png')
	}
];

function fail(message) {
	throw new Error(`Social card capture failed: ${message}`);
}

function delay(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function fetchWithTimeout(url, timeoutMs = 5_000) {
	return fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
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

async function waitForExit(child, timeoutMs = 1000) {
	if (child.exitCode !== null || child.signalCode !== null) return;
	await new Promise((resolve) => {
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

async function startVite() {
	const port = await getFreePort();
	const url = `http://${host}:${port}`;
	const output = [];
	const server = spawn(
		'bun',
		['run', 'dev', '--', '--host', host, '--port', String(port), '--strictPort'],
		{
			cwd: webRoot,
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
		output: () => output.join(''),
		stop: async () => {
			server.kill('SIGTERM');
			await waitForExit(server);
		}
	};
}

async function startChromium() {
	const port = await getFreePort();
	await mkdir(scratchRoot, { recursive: true });
	const profile = await mkdtemp(path.join(scratchRoot, 'chromium-profile-'));
	const browser = spawn(
		chromiumBin,
		[
			'--headless=new',
			'--disable-gpu',
			'--no-sandbox',
			'--hide-scrollbars',
			'--force-color-profile=srgb',
			`--remote-debugging-port=${port}`,
			`--user-data-dir=${profile}`,
			'about:blank'
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
			await rm(profile, { recursive: true, force: true });
		}
	};
}

async function withCdp(page, callback) {
	const ws = new WebSocket(page.webSocketDebuggerUrl);
	let nextId = 1;
	const pending = new Map();

	ws.onmessage = (event) => {
		const message = JSON.parse(event.data);
		if (!message.id || !pending.has(message.id)) return;
		const { resolve, reject } = pending.get(message.id);
		pending.delete(message.id);
		message.error ? reject(new Error(message.error.message)) : resolve(message.result);
	};

	await new Promise((resolve, reject) => {
		ws.onopen = resolve;
		ws.onerror = () => reject(new Error('Could not connect to Chromium page websocket.'));
	});

	function send(method, params = {}) {
		const id = nextId++;
		ws.send(JSON.stringify({ id, method, params }));
		return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
	}

	try {
		return await callback(send);
	} finally {
		ws.close();
	}
}

async function captureCard(send, baseUrl, card) {
	await send('Page.enable');
	await send('Runtime.enable');
	await send('Emulation.setDeviceMetricsOverride', {
		width: card.width,
		height: card.height,
		deviceScaleFactor: 1,
		mobile: false,
		screenWidth: card.width,
		screenHeight: card.height
	});
	await send('Page.navigate', { url: `${baseUrl}/#slide-1` });
	await send('Runtime.evaluate', {
		expression: `new Promise(async (resolve) => {
			const deadline = performance.now() + 8000;
			const tick = () => {
				const slide = document.querySelector('#slide-1');
				if (document.readyState !== 'loading' && slide) {
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
	await send('Runtime.evaluate', {
		expression: `new Promise(async (resolve) => {
			await document.fonts.ready;
			const style = document.createElement('style');
			style.textContent = '*{animation:none!important;transition:none!important;scroll-behavior:auto!important}.dots,.next-slide-cue{display:none!important}html,body{overflow:hidden!important}';
			document.head.appendChild(style);
			document.getElementById('slide-1')?.scrollIntoView({ block: 'start' });
			requestAnimationFrame(() => requestAnimationFrame(resolve));
		})`,
		awaitPromise: true,
		returnByValue: true
	});

	const screenshot = await send('Page.captureScreenshot', {
		format: 'png',
		fromSurface: true,
		clip: { x: 0, y: 0, width: card.width, height: card.height, scale: 1 }
	});
	await writeFile(card.output, Buffer.from(screenshot.data, 'base64'));
	console.log(`wrote ${card.label} card ${card.width}x${card.height}: ${path.relative(webRoot, card.output)}`);
}

let vite;
let chromium;
try {
	vite = await startVite();
	chromium = await startChromium();
	await withCdp(chromium.page, async (send) => {
		for (const card of cards) {
			await captureCard(send, vite.url, card);
		}
	});
} finally {
	await chromium?.stop();
	await vite?.stop();
}

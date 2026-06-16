#!/usr/bin/env node
// tweet-card — render any X/Twitter post(s) as a clean PNG via X's official embed widget.
// Login-free (uses platform.twitter.com widgets.js createTweet over a local http origin).
//
//   Single:        node tweet-card.mjs <url> -o out.png
//   With parent:   node tweet-card.mjs <reply-url> --thread -o out.png      (auto immediate parent)
//   Specific pair: node tweet-card.mjs <top-url> <bottom-url> -o out.png    (stacked in order)
//
// Flags: -o <path> (default tweet-card.png) | --theme dark|light (default dark)
//        --width N (250-550, default 550) | --gap N (px between stacked cards, default 14)
//        --thread (conversation=all -> include immediate parent for a reply)
import { mkdtemp, writeFile, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import net from 'node:net';
import http from 'node:http';

const pexec = promisify(execFile);
const argv = process.argv.slice(2);
const flag = (name, def) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : def; };
const has = (name) => argv.includes(name);
const urls = argv.filter((a) => /^https?:\/\//.test(a) || /^\d{6,}$/.test(a));
const out = flag('-o', 'tweet-card.png');
const theme = flag('--theme', 'dark');
const width = Number(flag('--width', '550'));
const gap = Number(flag('--gap', '14'));
const conv = has('--thread') ? 'all' : 'none';
if (!urls.length) { console.error('usage: node tweet-card.mjs <url...> -o out.png [--theme dark|light] [--width N] [--thread] [--gap N]'); process.exit(1); }
const ids = urls.map((u) => (String(u).match(/status\/(\d+)/) || [null, u])[1]);

const host = '127.0.0.1';
const bg = theme === 'light' ? '#ffffff' : '#000000';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const getFreePort = () => new Promise((res, rej) => { const s = net.createServer(); s.listen(0, host, () => { const { port } = s.address(); s.close(() => res(port)); }); s.on('error', rej); });

const pageHtml = (id) => `<!doctype html><html><head><meta charset="utf-8">
<style>html,body{margin:0;background:${bg}}#c{display:block;width:${width}px;padding:20px}</style></head>
<body><div id="c"></div>
<script src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>
<script>window.__status='init';(function go(){if(!(window.twttr&&twttr.widgets&&twttr.widgets.createTweet)){return setTimeout(go,80);}window.__status='creating';twttr.widgets.createTweet('${id}',document.getElementById('c'),{theme:'${theme}',width:${width},conversation:'${conv}',dnt:true,align:'center'}).then(function(el){window.__status=el?'ok':'empty';}).catch(function(e){window.__status='error:'+(e&&e.message||e);});})();</script>
</body></html>`;

const httpPort = await getFreePort();
let currentId = ids[0];
const server = http.createServer((req, res) => { res.writeHead(200, { 'content-type': 'text/html' }); res.end(pageHtml(currentId)); });
await new Promise((r) => server.listen(httpPort, host, r));

const chromiumBin = process.env.CHROMIUM_BIN ?? '/usr/bin/chromium';
const profile = await mkdtemp(path.join(tmpdir(), 'tweetcard-'));
const cdpPort = await getFreePort();
const browser = spawn(chromiumBin, ['--headless=new','--disable-gpu','--no-sandbox','--hide-scrollbars','--force-device-scale-factor=2',`--window-size=${width + 160},2400`,`--remote-debugging-port=${cdpPort}`,`--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });

const tmpShots = [];
try {
	for (let i = 0; i < 100; i++) { try { if ((await fetch(`http://${host}:${cdpPort}/json`)).ok) break; } catch {} await sleep(150); }
	const page = (await (await fetch(`http://${host}:${cdpPort}/json`)).json()).find((p) => p.type === 'page');
	const ws = new WebSocket(page.webSocketDebuggerUrl);
	let mid = 0; const pending = new Map();
	ws.addEventListener('message', (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
	await new Promise((r) => ws.addEventListener('open', r, { once: true }));
	const send = (m, p = {}) => new Promise((res) => { const myId = ++mid; pending.set(myId, res); ws.send(JSON.stringify({ id: myId, method: m, params: p })); });
	const evald = (e, ap = false) => send('Runtime.evaluate', { expression: e, awaitPromise: ap, returnByValue: true });
	await send('Page.enable'); await send('Runtime.enable');

	for (let n = 0; n < ids.length; n++) {
		currentId = ids[n];
		await send('Page.navigate', { url: `http://${host}:${httpPort}/?t=${Date.now ? n : n}` });
		let status = 'init', lastH = 0, stable = 0;
		for (let i = 0; i < 160; i++) {
			const r = await evald(`(()=>{const f=document.querySelector('#c iframe');const h=f?Math.round(f.getBoundingClientRect().height):0;return JSON.stringify({s:window.__status||'pending',h});})()`);
			const v = r.result?.result?.value ? JSON.parse(r.result.result.value) : { s: 'noctx', h: 0 };
			status = v.s || 'pending';
			if (v.h > 120 && v.h === lastH) { if (++stable >= 3) break; } else stable = 0;
			lastH = v.h;
			if (status.startsWith('error') || status === 'empty') break;
			await sleep(150);
		}
		if (status !== 'ok' || lastH < 120) throw new Error(`tweet ${currentId} render failed (status=${status}, h=${lastH})`);
		await sleep(350);
		const m = await evald(`(()=>{const f=document.querySelector('#c iframe');const b=f.getBoundingClientRect();return JSON.stringify({x:b.x,y:b.y,w:b.width,h:b.height});})()`);
		const r = JSON.parse(m.result.result.value);
		const shot = await send('Page.captureScreenshot', { format: 'png', clip: { x: Math.max(0, r.x), y: Math.max(0, r.y), width: r.w, height: r.h, scale: 1 }, captureBeyondViewport: true });
		const p = path.join(profile, `shot-${n}.png`);
		await writeFile(p, Buffer.from(shot.result.data, 'base64'));
		tmpShots.push(p);
		console.error(`captured ${currentId} (${r.w}x${r.h})`);
	}
	ws.close();

	if (tmpShots.length === 1) {
		await writeFile(out, await readFile(tmpShots[0]));
	} else {
		// stack vertically on the bg color with a gap between cards
		const args = [];
		tmpShots.forEach((p, i) => { if (i) args.push('-size', `1x${gap * 2}`, `xc:${bg}`); args.push(p); });
		await pexec('magick', [...args, '-background', bg, '-append', out]);
	}
	console.log('wrote', out);
} finally {
	browser.kill('SIGTERM');
	server.close();
	await sleep(300);
	await rm(profile, { recursive: true, force: true });
}

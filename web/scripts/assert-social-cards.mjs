#!/usr/bin/env node
import { readFile } from 'node:fs/promises';

const expected = [
	{
		label: 'Open Graph',
		path: 'static/og-recursive-coding-agents.png',
		url: 'https://recursivecodingagents.com/og-recursive-coding-agents.png',
		width: 1200,
		height: 630,
		meta: [
			'<meta property="og:type" content="website" />',
			'<meta property="og:site_name" content="Recursive Coding Agents" />',
			'<meta property="og:title" content="Recursive Coding Agents" />',
			'<meta property="og:url" content="https://recursivecodingagents.com/" />',
			'<meta property="og:image" content="https://recursivecodingagents.com/og-recursive-coding-agents.png" />',
			'<meta property="og:image:width" content="1200" />',
			'<meta property="og:image:height" content="630" />'
		]
	},
	{
		label: 'Twitter',
		path: 'static/twitter-recursive-coding-agents.png',
		url: 'https://recursivecodingagents.com/twitter-recursive-coding-agents.png',
		width: 1200,
		height: 600,
		meta: [
			'<meta name="twitter:card" content="summary_large_image" />',
			'<meta name="twitter:title" content="Recursive Coding Agents" />',
			'<meta name="twitter:image" content="https://recursivecodingagents.com/twitter-recursive-coding-agents.png" />'
		]
	}
];

function fail(message) {
	throw new Error(`Social card assertion failed: ${message}`);
}

function normalizeHtml(html) {
	return html.replace(/\s+/g, ' ').trim();
}

function pngSize(buffer) {
	const signature = buffer.subarray(0, 8).toString('hex');
	if (signature !== '89504e470d0a1a0a') fail('social card image is not a PNG.');
	return {
		width: buffer.readUInt32BE(16),
		height: buffer.readUInt32BE(20)
	};
}

const appHtml = normalizeHtml(await readFile('src/app.html', 'utf8'));
const assetDocs = await readFile('ASSETS.md', 'utf8');

for (const card of expected) {
	const image = await readFile(card.path);
	const size = pngSize(image);
	if (size.width !== card.width || size.height !== card.height) {
		fail(`${card.label} image must be ${card.width}x${card.height}; found ${size.width}x${size.height}.`);
	}
	if (image.byteLength < 20_000) {
		fail(`${card.label} image is unexpectedly small (${image.byteLength} bytes).`);
	}
	for (const meta of card.meta) {
		if (!appHtml.includes(normalizeHtml(meta))) fail(`${card.label} missing meta tag: ${meta}`);
	}
	if (!assetDocs.includes(card.path.replace('static/', ''))) {
		fail(`${card.label} image is missing from ASSETS.md.`);
	}
	if (!appHtml.includes(card.url)) {
		fail(`${card.label} absolute image URL is missing from app.html.`);
	}
}

console.log('Social card assertions passed.');

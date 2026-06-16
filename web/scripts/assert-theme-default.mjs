#!/usr/bin/env node
import { readFile } from 'node:fs/promises';

const activeThemePath = 'src/lib/themes/active.ts';
const rendererPath = 'src/lib/shadcn-theme.ts';
const appCssPath = 'src/app.css';

let activeTheme;
let renderer;
let appCss;

try {
	[activeTheme, renderer, appCss] = await Promise.all([
		readFile(activeThemePath, 'utf8'),
		readFile(rendererPath, 'utf8'),
		readFile(appCssPath, 'utf8')
	]);
} catch (error) {
	console.error(error instanceof Error ? error.message : String(error));
	process.exit(1);
}

const expectations = [
	{
		ok: activeTheme.includes('https://tweakcn.com/themes/cmlm03etv000204lh15608kec'),
		message: `${activeThemePath} must be generated from the default Zen tweakcn theme id.`
	},
	{
		ok: activeTheme.includes('"name": "Zen Inspired Theme"'),
		message: `${activeThemePath} must contain the Zen Inspired Theme registry item.`
	},
	{
		ok: activeTheme.includes('"background": "oklch(0.9195 0.0169 88.0030)"'),
		message: `${activeThemePath} is missing the Zen light background token.`
	},
	{
		ok: activeTheme.includes('"background": "oklch(0.1913 0 0)"'),
		message: `${activeThemePath} is missing the Zen dark background token.`
	},
	{
		ok: renderer.includes("block(':root:root', rootVars)"),
		message: `${rendererPath} must emit a higher-specificity :root selector so the active theme wins over fallback tokens.`
	},
	{
		ok: renderer.includes("block(':root.dark, .dark.dark', darkVars)"),
		message: `${rendererPath} must emit a higher-specificity dark selector so the active theme wins over fallback tokens.`
	},
	{
		ok: appCss.includes("a:not([data-slot='button'])"),
		message: `${appCssPath} must not let global anchor styles override shadcn button variant colors.`
	},
	{
		ok: !/\\na\\s*{\\s*color:\\s*inherit;\\s*}/.test(appCss),
		message: `${appCssPath} must not restore a broad a { color: inherit; } rule that makes primary button anchors illegible.`
	}
];

const failures = expectations.filter((expectation) => !expectation.ok);

if (failures.length > 0) {
	for (const failure of failures) console.error(`Theme assertion failed: ${failure.message}`);
	process.exit(1);
}

console.log('Theme default assertions passed.');

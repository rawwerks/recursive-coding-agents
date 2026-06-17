#!/usr/bin/env node
import { access, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);

function readArg(name) {
	const index = args.indexOf(name);
	if (index === -1) return null;
	const value = args[index + 1];
	if (!value || value.startsWith('--')) {
		throw new Error(`${name} requires a value.`);
	}
	return value;
}

function hasArg(name) {
	return args.includes(name);
}

async function exists(file) {
	try {
		await access(file, constants.F_OK);
		return true;
	} catch {
		return false;
	}
}

const cwd = process.cwd();
const webRoot = (await exists(path.join(cwd, 'src', 'slides'))) ? cwd : path.join(cwd, 'web');
const repoRoot = path.basename(webRoot) === 'web' ? path.dirname(webRoot) : cwd;
const baseRef = readArg('--base') ?? 'HEAD';
const outArg = readArg('--out');
const requireIntent = hasArg('--require-intent');
const printJson = hasArg('--json');
const intent = readArg('--intent') ?? process.env.VISUAL_QC_INTENT ?? '';
const intentFile = readArg('--intent-file');
const fullIntent = intentFile ? await readFile(path.resolve(cwd, intentFile), 'utf8') : intent;

function git(args) {
	return execFileSync('git', args, {
		cwd: repoRoot,
		encoding: 'utf8',
		stdio: ['ignore', 'pipe', 'pipe']
	}).trim();
}

function safeSlug(value) {
	return String(value)
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 80);
}

function uniq(values) {
	return [...new Set(values.filter(Boolean))];
}

function parseFrontmatterLabel(source, fallback) {
	const match = source.match(/^---\n([\s\S]*?)\n---/);
	const label = match?.[1].match(/^label:\s*(.+)$/m)?.[1]?.trim();
	return label?.replace(/^['"]|['"]$/g, '') || fallback;
}

async function loadSlides() {
	const slideDir = path.join(webRoot, 'src', 'slides');
	const files = (await readdir(slideDir)).filter((file) => file.endsWith('.md')).sort();
	const slides = [];
	for (const file of files) {
		const slug = file.replace(/\.md$/, '');
		const fullPath = path.join(slideDir, file);
		const source = await readFile(fullPath, 'utf8');
		const imports = [...source.matchAll(/import\s+([A-Z][A-Za-z0-9_]*)\s+from\s+['"]\$lib\/([^'"]+)['"]/g)];
		const componentTags = [...source.matchAll(/<([A-Z][A-Za-z0-9_]*)\b/g)].map((match) => match[1]);
		slides.push({
			slug,
			label: parseFrontmatterLabel(source, slug),
			file: path.relative(repoRoot, fullPath),
			source,
			components: uniq([
				...imports.map((match) => path.basename(match[2], '.svelte')),
				...componentTags
			])
		});
	}
	return slides;
}

function changedFiles() {
	const changed = [];
	try {
		changed.push(...git(['diff', '--name-only', '--diff-filter=ACMRTUBD', baseRef, '--', 'web']).split('\n'));
	} catch (error) {
		throw new Error(`Could not diff against ${baseRef}: ${error instanceof Error ? error.message : String(error)}`);
	}
	try {
		changed.push(...git(['ls-files', '--others', '--exclude-standard', 'web']).split('\n'));
	} catch {
		// Untracked detection is useful but not worth failing the report.
	}
	return uniq(changed).sort();
}

function classifyFile(file) {
	if (/^web\/src\/(?:app\.css|routes\/\+page\.svelte)$/.test(file)) return 'high';
	if (/^web\/src\/lib\/(?:Slide|Deck)\.svelte$/.test(file)) return 'high';
	if (/^web\/src\/lib\/.*\.svelte$/.test(file)) return 'medium';
	if (/^web\/src\/slides\/.*\.md$/.test(file)) return 'medium';
	if (/^web\/static\/.*\.(png|jpe?g|webp|gif|svg)$/i.test(file)) return 'medium';
	if (/^web\/scripts\/assert-slide-layout\.mjs$/.test(file)) return 'medium';
	if (/^web\/scripts\/visual-qc-report\.mjs$/.test(file)) return 'low';
	if (/^web\/VISUAL_QC\.md$/.test(file)) return 'low';
	return 'low';
}

function isHarnessOnlyFile(file) {
	return /^web\/(?:AGENTS\.md|VISUAL_QC\.md|package\.json|scripts\/(?:assert-slide-layout|visual-qc-report)\.mjs)$/.test(
		file
	);
}

function higherRisk(a, b) {
	const order = { low: 0, medium: 1, high: 2 };
	return order[a] >= order[b] ? a : b;
}

function recommendedViewports(risk) {
	if (risk === 'high') return ['desktop', 'short-desktop', 'mobile', 'narrow-mobile'];
	if (risk === 'medium') return ['desktop', 'mobile'];
	return [];
}

function hurtCheckPrompt(manifest) {
	const affected =
		manifest.affectedSlides.length > 0
			? manifest.affectedSlides.map((slide) => `- ${slide.label} (${slide.slug})`).join('\n')
			: '- No specific slide detected; treat as global if a visual file changed.';

	return `You are the visual hurt-check reviewer for recursivecodingagents.com.

Assume the current deck is already polished. Your job is not to invent improvements.
Compare the before/after screenshots and answer whether the proposed change made any approved slide worse.

Intent:
${manifest.intent || '(missing intent - ask for the reason before approving)'}

Risk: ${manifest.risk}
Affected slides:
${affected}

Required answer:
1. PASS or FAIL.
2. List every slide that got worse, even if tests pass.
3. Call out text/object alignment regressions, crop changes, line wrapping changes, overlap, footer/dot interference, and changed visual rhythm.
4. If a mathematical audit failure was fixed by shrinking or compressing a polished object, treat that as suspect until explicitly approved.
`;
}

const slides = await loadSlides();
const changed = changedFiles();
const affected = new Map();
let allSlidesAffected = false;
let risk = 'low';

for (const file of changed) {
	risk = higherRisk(risk, classifyFile(file));

	const slideMatch = file.match(/^web\/src\/slides\/(.+)\.md$/);
	if (slideMatch) {
		const slide = slides.find((candidate) => candidate.slug === slideMatch[1]);
		if (slide) {
			affected.set(slide.slug, { ...slide, reason: 'slide markdown changed' });
		} else {
			affected.set(slideMatch[1], {
				slug: slideMatch[1],
				label: `${slideMatch[1]} (deleted)`,
				file,
				reason: 'slide markdown deleted or unavailable'
			});
		}
		continue;
	}

	const componentMatch = file.match(/^web\/src\/lib\/(.+)\.svelte$/);
	if (componentMatch) {
		const component = componentMatch[1];
		if (['Slide', 'Deck'].includes(component)) {
			allSlidesAffected = true;
			continue;
		}
		for (const slide of slides) {
			if (slide.components.includes(component)) {
				affected.set(slide.slug, { ...slide, reason: `${component} component changed` });
			}
		}
		continue;
	}

	if (/^web\/src\/(?:app\.css|routes\/\+page\.svelte)$/.test(file)) {
		allSlidesAffected = true;
		continue;
	}

	const assetMatch = file.match(/^web\/static\/(.+)$/);
	if (assetMatch) {
		const assetName = path.basename(assetMatch[1]);
		for (const slide of slides) {
			if (slide.source.includes(assetName)) {
				affected.set(slide.slug, { ...slide, reason: `${assetName} asset changed` });
			}
		}
	}
}

const affectedSlides = allSlidesAffected
	? slides.map((slide) => ({ slug: slide.slug, label: slide.label, file: slide.file, reason: 'global visual surface changed' }))
	: [...affected.values()].map((slide) => ({
			slug: slide.slug,
			label: slide.label,
			file: slide.file,
			reason: slide.reason
		}));

const timestamp = new Date().toISOString().replaceAll(':', '-').replace(/\.\d+Z$/, 'Z');
const outDir = outArg
	? path.resolve(cwd, outArg)
	: path.join(homedir(), 'scratch', 'recursive-coding-agents-talk', 'visual-qc', timestamp);
const harnessOnly = changed.length > 0 && changed.every(isHarnessOnlyFile);
const rawRisk = risk;
const reviewRisk = harnessOnly ? 'low' : rawRisk;
const requiresHurtCheck = reviewRisk !== 'low';
const manifest = {
	generatedAt: new Date().toISOString(),
	baseRef,
	head: git(['rev-parse', '--short', 'HEAD']),
	risk: reviewRisk,
	rawRisk,
	intent: fullIntent.trim(),
	intentPresent: Boolean(fullIntent.trim()),
	changedFiles: changed,
	affectedSlides,
	allSlidesAffected,
	harnessOnly,
	recommendedViewports: recommendedViewports(reviewRisk),
	requiresHurtCheck,
	requiredArtifacts:
		reviewRisk === 'low'
			? []
			: [
					'before screenshots for affected slides',
					'after screenshots for affected slides',
					'DOM geometry JSON for affected slides',
					'hurt-check reviewer PASS/FAIL note'
				]
};

const review = `# Visual QC Report

Generated: ${manifest.generatedAt}
Base: \`${manifest.baseRef}\`
Head: \`${manifest.head}\`
Risk: **${manifest.risk}**
Raw risk: **${manifest.rawRisk}**
Intent present: **${manifest.intentPresent ? 'yes' : 'no'}**

## Intent

${manifest.intent || '_Missing. Add `--intent \"...\"` or `VISUAL_QC_INTENT` before approving a visual change._'}

## Changed Files

${manifest.changedFiles.length ? manifest.changedFiles.map((file) => `- \`${file}\``).join('\n') : '- No changed web files detected.'}

## Affected Slides

${
	manifest.affectedSlides.length
		? manifest.affectedSlides
				.map((slide) => `- ${slide.label} (\`${slide.slug}\`) - ${slide.reason}`)
				.join('\n')
		: '- No specific slide detected.'
}

## Required Review

${
	manifest.requiresHurtCheck
		? [
				'- Capture before/after screenshots for the affected slides only.',
				`- Use these viewports: ${manifest.recommendedViewports.join(', ')}.`,
				'- Run a hurt-check reviewer before commit.',
				'- Do not shrink, crop, compress, or reflow polished content just to satisfy a math assertion without explicit approval.'
			].join('\n')
		: manifest.harnessOnly
			? '- Harness-only change. Review the generated policy/report behavior; slide screenshots are not required unless the harness itself changes rendering.'
		: '- Low-risk harness/docs change. Full visual capture is optional.'
}

## Hurt-Check Prompt

\`\`\`text
${hurtCheckPrompt(manifest)}
\`\`\`
`;

await mkdir(outDir, { recursive: true });
await writeFile(path.join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
await writeFile(path.join(outDir, 'review.md'), review);

if (printJson) {
	console.log(JSON.stringify(manifest, null, 2));
} else {
	console.log(`Visual QC report: ${outDir}`);
	console.log(`Risk: ${manifest.risk}`);
	if (manifest.rawRisk !== manifest.risk) console.log(`Raw risk: ${manifest.rawRisk}`);
	console.log(`Affected slides: ${manifest.affectedSlides.length || 'none detected'}`);
	if (!manifest.intentPresent && manifest.requiresHurtCheck) {
		console.log('Intent missing: add --intent or VISUAL_QC_INTENT before approving visual changes.');
	}
}

if (requireIntent && manifest.requiresHurtCheck && !manifest.intentPresent) {
	process.exitCode = 2;
}

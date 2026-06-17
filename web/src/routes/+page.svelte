<script lang="ts">
	import Deck from '$lib/Deck.svelte';
	import Slide from '$lib/Slide.svelte';
	import { slideOrder } from '../slides/order';

	type Variant = 'default' | 'title' | 'section' | 'split' | 'quote' | 'code' | 'grid' | 'image';
	interface Meta {
		label?: string;
		variant?: Variant;
		alt?: boolean;
		align?: 'left' | 'center';
		background?: string;
		eyebrow?: string;
		cta_text?: string;
		cta_href?: string;
	}
	interface MdModule {
		metadata: Meta;
		default: import('svelte').Component;
	}

	// Each slide is a markdown file in src/slides/*.md (compiled by mdsvex).
	// Reorder the talk by moving semantic slide names in src/slides/order.ts.
	const modules = import.meta.glob('/src/slides/*.md', { eager: true }) as Record<
		string,
		MdModule
	>;
	const slides = slideOrder.map((slug) => {
		const path = `/src/slides/${slug}.md`;
		const mod = modules[path];
		if (!mod) throw new Error(`Missing slide: ${path}`);
		return { meta: mod.metadata ?? {}, Content: mod.default };
	});

	const title = 'Recursive Coding Agents — Raymond Weitekamp';
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content="Recursive Coding Agents — a talk by Raymond Weitekamp (OpenProse)." />
</svelte:head>

<Deck label="Recursive Coding Agents">
	{#each slides as { meta, Content }, i (i)}
		<Slide
			label={meta.label}
			variant={meta.variant ?? 'default'}
			alt={meta.alt ?? false}
			align={meta.align}
			background={meta.background}
		>
			{#if meta.eyebrow}<p class="eyebrow">{meta.eyebrow}</p>{/if}
			<div class="prose"><Content /></div>
			{#if meta.cta_text && meta.cta_href}
				<a class="cta" href={meta.cta_href} target="_blank" rel="noopener noreferrer"
					>{meta.cta_text}</a
				>
			{/if}
		</Slide>
	{/each}
</Deck>

<style>
	/* Markdown (mdsvex) content inside each slide, mapped to the deck type scale.
	   Global because each compiled .md is its own child component; scoped under
	   .prose so the frontmatter eyebrow + cta keep their own classes. */
	:global(.slide .content .prose > :first-child) {
		margin-top: 0;
	}
	:global(.slide .content .prose h1) {
		margin: 0 0 clamp(1.1rem, 2.8vw, 1.8rem);
		font-size: var(--fs-title);
		font-weight: 700;
		line-height: 1.05;
		color: var(--deck-text);
	}
	:global(.slide .content .prose h2) {
		margin: 0 0 clamp(1.2rem, 3.5vw, 2.2rem);
		font-size: var(--fs-heading);
		font-weight: 700;
		line-height: 1.1;
		color: var(--deck-text);
	}
	:global(.slide .content .prose p) {
		margin: clamp(1rem, 2.6vw, 1.6rem) 0 0;
		font-size: var(--fs-body);
		color: var(--deck-muted);
	}
	:global(.slide .content .prose hr) {
		width: min(100%, 860px);
		height: clamp(3px, 0.35vw, 6px);
		margin: clamp(1.7rem, 4vw, 2.9rem) 0 clamp(1.8rem, 4.4vw, 3.2rem);
		border: 0;
		border-radius: 999px;
		background: color-mix(in oklch, var(--deck-text) 34%, var(--deck-bg));
	}
	:global(.slide .content .prose .url-previews) {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: clamp(0.85rem, 2vw, 1.25rem);
		margin-top: clamp(1rem, 2.4vw, 1.6rem);
	}
	:global(.slide .content .prose .workflow-example-links) {
		display: grid;
		gap: clamp(0.65rem, 1.5vw, 0.9rem);
		margin-top: clamp(1rem, 2.4vw, 1.45rem);
	}
	:global(.slide .content .prose .workflow-showcase) {
		display: grid;
		grid-template-areas:
			'copy article'
			'examples examples';
		grid-template-columns: minmax(0, 0.86fr) minmax(410px, 0.82fr);
		gap: clamp(1rem, 2.4vw, 1.8rem) clamp(1.35rem, 3.4vw, 2.4rem);
		align-items: center;
	}
	:global(.slide .content .prose .workflow-copy) {
		grid-area: copy;
		max-width: 44rem;
	}
	:global(.slide .content .prose .workflow-copy h2) {
		margin-bottom: clamp(0.9rem, 2.3vw, 1.35rem);
		text-wrap: balance;
	}
	:global(.slide .content .prose .workflow-copy p) {
		max-width: 41ch;
		margin-top: 0;
		text-wrap: pretty;
	}
	:global(.slide .content .prose .workflow-article) {
		grid-area: article;
		display: grid;
		overflow: hidden;
		border: 1px solid color-mix(in oklch, var(--deck-text) 18%, transparent);
		border-radius: 8px;
		background: color-mix(in oklch, var(--deck-text) 5%, var(--deck-bg));
		box-shadow: 0 28px 72px -38px color-mix(in oklch, var(--deck-text) 58%, transparent);
	}
	:global(.slide .content .prose .workflow-article img) {
		display: block;
		width: 100%;
		aspect-ratio: 690 / 506;
		height: auto;
		object-fit: contain;
		object-position: center;
		background: rgb(20 20 19);
	}
	:global(.slide .content .prose .workflow-article span) {
		display: block;
		padding: 0.72rem 0.9rem;
		font-size: clamp(0.72rem, 0.66rem + 0.22vw, 0.86rem);
		font-weight: 780;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: color-mix(in oklch, var(--deck-text) 84%, var(--deck-bg));
	}
	:global(.slide .content .prose .workflow-showcase .workflow-example-links) {
		grid-area: examples;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: clamp(0.85rem, 2vw, 1.2rem);
		margin-top: 0;
	}
	:global(.slide .content .prose .url-preview) {
		display: block;
		overflow: hidden;
		padding: clamp(0.7rem, 1.5vw, 1rem);
		border: 1px solid color-mix(in oklch, var(--deck-text) 16%, transparent);
		border-radius: 8px;
		background: color-mix(in oklch, var(--deck-text) 4%, var(--deck-bg));
		text-decoration: none;
		box-shadow: 0 18px 50px -34px color-mix(in oklch, var(--deck-text) 48%, transparent);
		transition:
			border-color 0.16s ease,
			background 0.16s ease,
			transform 0.16s ease;
	}
	:global(.slide .content .prose .url-preview img) {
		display: block;
		width: 100%;
		height: clamp(135px, 18dvh, 210px);
		object-fit: cover;
		object-position: top center;
		border-radius: 5px;
		border: 1px solid color-mix(in oklch, var(--deck-text) 12%, transparent);
		background: white;
	}
	:global(.slide .content .prose .url-preview .preview-caption) {
		display: grid;
		gap: 0.35rem;
		margin-top: clamp(0.55rem, 1.2vw, 0.85rem);
	}
	:global(.slide .content .prose .url-preview:hover) {
		border-color: color-mix(in oklch, var(--deck-accent) 48%, var(--deck-text));
		background: color-mix(in oklch, var(--deck-text) 7%, var(--deck-bg));
		transform: translateY(-2px);
	}
	:global(.slide .content .prose .url-preview:focus-visible) {
		outline: 2px solid var(--deck-accent);
		outline-offset: 3px;
	}
	:global(.slide .content .prose .url-preview .preview-source) {
		font-size: clamp(0.72rem, 0.66rem + 0.22vw, 0.86rem);
		font-weight: 700;
		letter-spacing: 0.13em;
		text-transform: uppercase;
		color: var(--deck-accent);
	}
	:global(.slide .content .prose .url-preview strong) {
		font-size: clamp(0.95rem, 0.82rem + 0.48vw, 1.2rem);
		line-height: 1.14;
		color: var(--deck-text);
	}
	:global(.slide .content .prose .url-preview .preview-note) {
		display: block;
		font-size: clamp(0.85rem, 0.76rem + 0.3vw, 1rem);
		line-height: 1.35;
		color: var(--deck-muted);
	}
	:global(.slide .content .prose .workflow-example-links .url-preview) {
		min-height: clamp(9.5rem, 16dvh, 11.6rem);
		padding: clamp(0.95rem, 1.9vw, 1.25rem);
	}
	:global(.slide .content .prose .workflow-example-links .preview-caption) {
		gap: clamp(0.42rem, 1vw, 0.58rem);
		margin-top: 0;
	}
	:global(.slide .content .prose .workflow-example-links .preview-source) {
		letter-spacing: 0.05em;
		text-transform: none;
	}
	:global(.slide .content .prose .workflow-example-links strong) {
		font-size: clamp(1.04rem, 0.88rem + 0.6vw, 1.34rem);
	}
	:global(.slide .content .prose .workflow-example-links .preview-note) {
		font-size: clamp(0.86rem, 0.78rem + 0.28vw, 0.98rem);
	}
	:global(.slide .content .prose .nowrap) {
		white-space: nowrap;
	}
	:global(.slide[data-label='We all want outcomes'] .content) {
		min-height: calc(100dvh - (var(--pad) * 2));
		display: flex;
		flex-direction: column;
	}
	:global(.slide[data-label='We all want outcomes'] .content .prose) {
		flex: 1;
		min-height: 0;
		display: flex;
	}
	:global(.slide .content .prose .outcomes-layout) {
		flex: 1;
		min-height: 0;
		display: grid;
		grid-template-rows: minmax(0, 1fr) auto;
		gap: clamp(1.2rem, 4dvh, 3rem);
	}
	:global(.slide .content .prose .outcomes-copy) {
		align-self: center;
	}
	:global(.slide .content .prose .outcomes-progression) {
		display: flex;
		justify-content: center;
		align-self: end;
		width: min(880px, 76vw, calc(16dvh * 2048 / 499));
		margin: 0 auto clamp(2.4rem, 5.5dvh, 4rem);
		pointer-events: none;
	}
	:global(.slide .content .prose .outcomes-progression img) {
		display: block;
		width: 100%;
		height: auto;
		opacity: 0.72;
		filter: drop-shadow(0 18px 28px color-mix(in oklch, var(--deck-text) 18%, transparent));
	}
	:global(.slide .content .prose .paper-split) {
		display: grid;
		grid-template-columns: minmax(0, 0.92fr) minmax(320px, 0.78fr);
		gap: clamp(1.5rem, 4vw, 3rem);
		align-items: center;
	}
	:global(.slide .content .prose .rlm-definition-layout) {
		display: grid;
		grid-template-rows: minmax(0, 1fr) auto;
		gap: clamp(1rem, 3dvh, 2rem);
		min-height: min(72dvh, 660px);
	}
	:global(.slide .content .prose .rlm-definition-layout .paper-split) {
		align-self: center;
	}
	:global(.slide .content .prose .rlm-tree-example) {
		justify-self: center;
		width: fit-content;
		max-width: 100%;
		margin: 0;
		padding: 0;
		border: 0;
		background: transparent;
		color: color-mix(in oklch, var(--deck-text) 82%, var(--deck-muted));
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono',
			monospace;
		font-size: clamp(0.9rem, 0.72rem + 0.52vw, 1.18rem);
		font-weight: 560;
		line-height: 1.2;
		letter-spacing: 0;
		text-align: left;
		white-space: pre;
		text-shadow: 0 12px 34px color-mix(in oklch, var(--deck-text) 18%, transparent);
	}
	:global(.slide .content .prose .evidence-split) {
		display: grid;
		grid-template-columns: minmax(0, 0.95fr) minmax(310px, 0.72fr);
		gap: clamp(1.4rem, 3.4vw, 2.6rem);
		align-items: center;
	}
	:global(.slide .content .prose .evidence-card) {
		display: block;
		text-decoration: none;
	}
	:global(.slide .content .prose .evidence-card img) {
		display: block;
		width: 100%;
		max-height: min(62dvh, 560px);
		object-fit: contain;
		border-radius: 8px;
		border: 1px solid color-mix(in oklch, var(--deck-text) 18%, transparent);
		box-shadow: 0 28px 70px -38px color-mix(in oklch, var(--deck-text) 55%, transparent);
	}
	:global(.slide .content .prose .rlm-article-x-card img) {
		border: 0;
		box-shadow: none;
		background: transparent;
	}
	:global(.slide .content .prose .slide-footer-claim) {
		max-width: 100%;
		margin: clamp(1.2rem, 3vw, 2rem) auto 0;
		text-align: center;
		font-size: clamp(1.22rem, 0.98rem + 1vw, 1.95rem);
		font-weight: 800;
		line-height: 1.12;
		color: var(--deck-text);
		text-wrap: balance;
	}
	:global(.slide .content .prose .slide-footer-claim strong) {
		color: inherit;
		font-weight: inherit;
	}
	:global(.slide .content .prose .prose-program-grid) {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: clamp(1rem, 2.4vw, 1.55rem);
		margin-top: clamp(1.25rem, 3vw, 1.9rem);
	}
	:global(.slide .content .prose .prose-program) {
		display: grid;
		grid-template-rows: auto auto 1fr auto;
		gap: clamp(0.55rem, 1.3vw, 0.82rem);
		align-content: start;
		min-height: clamp(24rem, 47dvh, 31rem);
		padding: clamp(0.95rem, 2vw, 1.35rem);
		border: 1px solid color-mix(in oklch, var(--deck-text) 18%, transparent);
		border-radius: 8px;
		background: color-mix(in oklch, var(--deck-text) 4.5%, var(--deck-bg));
		box-shadow: 0 24px 64px -42px color-mix(in oklch, var(--deck-text) 54%, transparent);
		transition:
			border-color 0.16s ease,
			background 0.16s ease,
			transform 0.16s ease;
	}
	:global(.slide .content .prose .prose-program:hover) {
		border-color: color-mix(in oklch, var(--deck-accent) 48%, var(--deck-text));
		background: color-mix(in oklch, var(--deck-text) 7%, var(--deck-bg));
		transform: translateY(-2px);
	}
	:global(.slide .content .prose .prose-program:focus-visible) {
		outline: 2px solid var(--deck-accent);
		outline-offset: 3px;
	}
	:global(.slide .content .prose .prose-program-label) {
		font-size: clamp(0.76rem, 0.68rem + 0.25vw, 0.9rem);
		font-weight: 780;
		letter-spacing: 0.06em;
		color: color-mix(in oklch, var(--deck-accent) 86%, var(--deck-text));
		text-transform: uppercase;
	}
	:global(.slide .content .prose .prose-program strong) {
		font-size: clamp(1.12rem, 0.92rem + 0.72vw, 1.48rem);
		line-height: 1.12;
		color: var(--deck-text);
	}
	:global(.slide .content .prose .prose-program-copy) {
		display: block;
		max-width: 46ch;
		font-size: clamp(0.9rem, 0.8rem + 0.32vw, 1.05rem);
		line-height: 1.4;
		color: var(--deck-muted);
	}
	:global(.slide .content .prose .prose-program-points) {
		display: grid;
		gap: 0.42rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	:global(.slide .content .prose .prose-program-points li) {
		position: relative;
		margin: 0;
		padding-left: 1rem;
		font-size: clamp(0.88rem, 0.78rem + 0.3vw, 1.02rem);
		line-height: 1.34;
		color: var(--deck-muted);
	}
	:global(.slide .content .prose .prose-program-points li::before) {
		content: '';
		position: absolute;
		left: 0;
		top: 0.62em;
		width: 0.34rem;
		height: 0.34rem;
		border-radius: 999px;
		background: color-mix(in oklch, var(--deck-accent) 70%, var(--deck-muted));
	}
	:global(.slide .content .prose .prose-program-points code) {
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono',
			monospace;
		font-size: 0.92em;
		color: color-mix(in oklch, var(--deck-text) 88%, var(--deck-muted));
	}
	:global(.slide .content .prose .prose-program pre) {
		overflow: hidden;
		margin: auto 0 0;
		padding: clamp(0.8rem, 1.6vw, 1.05rem);
		border: 1px solid color-mix(in oklch, var(--deck-text) 13%, transparent);
		border-radius: 6px;
		background: color-mix(in oklch, var(--deck-bg) 72%, black);
		color: color-mix(in oklch, var(--deck-text) 88%, var(--deck-bg));
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono',
			monospace;
		font-size: clamp(0.72rem, 0.63rem + 0.24vw, 0.86rem);
		line-height: 1.42;
		white-space: pre-wrap;
	}
	:global(.slide .content .prose .prose-program code) {
		font-family: inherit;
	}
	:global(.slide .content .prose .ftw-takeaways) {
		display: grid;
		grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.08fr);
		gap: clamp(1.5rem, 4vw, 3.8rem);
		align-items: stretch;
	}
	:global(.slide .content .prose .ftw-lockup) {
		position: relative;
		display: grid;
		align-content: end;
		overflow: hidden;
		min-height: var(--ftw-pretext-proof-height, clamp(25rem, 62dvh, 40rem));
		padding: clamp(1.25rem, 3vw, 2.2rem);
		border-radius: 8px;
		background: var(--deck-text);
		color: var(--deck-bg);
	}
	:global(.slide .content .prose .ftw-lockup::before) {
		content: '';
		position: absolute;
		inset: clamp(0.7rem, 1.7vw, 1.2rem);
		border: 1px solid color-mix(in oklch, var(--deck-bg) 42%, transparent);
		pointer-events: none;
	}
	:global(.slide .content .prose .ftw-lockup h1) {
		position: relative;
		z-index: 1;
		display: grid;
		gap: clamp(0.35rem, 1vw, 0.7rem);
		margin: 0;
		font-size: clamp(2rem, 4.4vw, 4.4rem);
		font-weight: 820;
		line-height: 0.98;
		color: inherit;
		text-wrap: balance;
	}
	:global(.slide .content .prose .ftw-lockup h1 span) {
		max-width: 8.6ch;
	}
	:global(.slide .content .prose .ftw-lockup h1 strong) {
		display: block;
		margin-left: -0.07em;
		font-size: clamp(6.6rem, 14vw, 10.8rem);
		font-weight: 900;
		line-height: 0.78;
		letter-spacing: 0;
		color: color-mix(in oklch, var(--deck-bg) 92%, var(--deck-text));
	}
	:global(.slide .content .prose .ftw-proof) {
		display: grid;
		align-content: stretch;
		min-height: var(--ftw-pretext-proof-height, auto);
	}
	:global(.slide .content .prose .ftw-proof p) {
		display: grid;
		grid-template-columns: minmax(17rem, 0.92fr) minmax(0, 1fr);
		gap: clamp(1.25rem, 3vw, 2.15rem);
		align-items: center;
		min-height: var(--ftw-row-measured-height, auto);
		margin: 0;
		padding: clamp(1.05rem, 2.5vw, 1.55rem) 0;
		border-top: 2px solid color-mix(in oklch, var(--deck-text) 36%, transparent);
	}
	:global(.slide .content .prose .ftw-proof p:last-child) {
		border-bottom: 2px solid color-mix(in oklch, var(--deck-text) 36%, transparent);
	}
	:global(.slide .content .prose .ftw-proof strong) {
		font-size: clamp(1.4rem, 2.25vw, 2.35rem);
		font-weight: 860;
		line-height: 1.04;
		color: var(--deck-text);
		text-wrap: wrap;
	}
	:global(.slide .content .prose .ftw-proof span) {
		max-width: 27ch;
		padding-top: clamp(0.06rem, 0.35vw, 0.22rem);
		font-size: clamp(0.98rem, 0.86rem + 0.48vw, 1.28rem);
		font-weight: 560;
		line-height: 1.3;
		color: var(--deck-muted);
		text-wrap: wrap;
	}
	:global(.slide .content .prose .bridge-quotes) {
		display: grid;
		gap: 2.2rem;
		width: 100%;
		margin: 0 auto;
		text-align: center;
	}
	:global(.slide .content .prose .bridge-quotes blockquote) {
		margin: 0;
		padding: 0;
		border: 0;
		color: var(--deck-text);
	}
	:global(.slide .content .prose .bridge-quotes blockquote p) {
		margin: 0;
		font-size: 3.45rem;
		font-weight: 720;
		line-height: 1.08;
		letter-spacing: 0;
		color: inherit;
		text-wrap: balance;
	}
	:global(.slide .content .prose .bridge-quotes .bridge-rule) {
		justify-self: center;
		width: 100%;
		height: 1px;
		background: linear-gradient(
			to right,
			transparent,
			color-mix(in oklch, var(--deck-text) 22%, transparent) 18%,
			color-mix(in oklch, var(--deck-text) 22%, transparent) 82%,
			transparent
		);
	}
	:global(.slide .content .prose .bridge-slide-layout) {
		display: grid;
		gap: clamp(1.35rem, 3dvh, 2rem);
		width: 100%;
		align-items: center;
	}
	:global(.slide .content .prose .bridge-slide-layout .bridge-quotes) {
		gap: clamp(0.7rem, 1.6dvh, 1.1rem);
	}
	:global(.slide .content .prose .bridge-slide-layout .bridge-quotes blockquote p) {
		font-size: clamp(1.7rem, 1.04rem + 2.3vw, 3.1rem);
		line-height: 1.06;
	}
	:global(.slide .content .prose .bridge-tree-comparison) {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: clamp(1.2rem, 3vw, 2.8rem);
		align-items: center;
		width: min(100%, 1180px);
		margin: 0 auto;
	}
	:global(.slide .content .prose .bridge-tree-panel) {
		display: grid;
		justify-items: center;
		align-content: center;
		gap: clamp(0.75rem, 1.7vw, 1.1rem);
		min-width: 0;
		margin: 0;
		padding: 0;
	}
	:global(.slide .content .prose .bridge-tree-panel h2) {
		margin: 0;
		font-size: clamp(1.05rem, 0.84rem + 0.78vw, 1.5rem);
		font-weight: 820;
		line-height: 1.05;
		color: var(--deck-accent);
		text-align: center;
		text-wrap: balance;
	}
	:global(.slide .content .prose .repo-preview-grid) {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: clamp(0.85rem, 2vw, 1.25rem);
		margin-top: clamp(1.1rem, 2.6vw, 1.7rem);
	}
	:global(.slide .content .prose .repo-preview-grid .repo-title) {
		font-size: clamp(1.1rem, 1.85vw, 1.45rem);
	}
	:global(.slide .content .prose .repo-preview-grid .repo-description) {
		margin-top: 0.55rem;
		font-size: clamp(0.88rem, 1.35vw, 1rem);
		line-height: 1.42;
	}
	:global(.slide .content .prose .repo-preview-grid .repo-meta-item) {
		font-size: clamp(0.74rem, 1.1vw, 0.84rem);
	}
	/* Other notable projects: a linked reading list of repos. Higher specificity than
	   the generic .prose ul / li / a rules above so it overrides their grid + underline. */
	:global(.slide .content .prose ul.project-list) {
		display: block;
		margin: clamp(0.7rem, 1.8vw, 1.2rem) 0 0;
		padding: 0;
		list-style: none;
	}
	:global(.slide .content .prose .project-list li) {
		display: block;
		margin: 0;
		font-size: inherit;
		line-height: inherit;
		color: inherit;
	}
	:global(.slide .content .prose .project-list li + li) {
		border-top: 1px solid color-mix(in oklch, var(--deck-text) 14%, transparent);
	}
	:global(.slide .content .prose .project-list .project) {
		display: grid;
		gap: 0.28rem;
		padding: clamp(0.42rem, 1vw, 0.66rem) 0;
		color: var(--deck-text);
		text-decoration: none;
		transition:
			padding-left 0.18s cubic-bezier(0.2, 0.7, 0.2, 1),
			color 0.16s ease;
	}
	:global(.slide .content .prose .project-list .project:hover),
	:global(.slide .content .prose .project-list .project:focus-visible) {
		padding-left: clamp(0.4rem, 1vw, 0.7rem);
		outline: none;
	}
	:global(.slide .content .prose .project-list .project:focus-visible) {
		outline: 2px solid var(--deck-accent);
		outline-offset: 4px;
		border-radius: 5px;
	}
	:global(.slide .content .prose .project-list .project-row) {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.4rem 1rem;
	}
	:global(.slide .content .prose .project-list .project-id) {
		display: inline-flex;
		align-items: center;
		gap: 0.6rem;
		min-width: 0;
	}
	:global(.slide .content .prose .project-list .project-mark) {
		display: grid;
		place-items: center;
		flex: 0 0 auto;
		color: color-mix(in oklch, var(--deck-text) 78%, var(--deck-muted));
	}
	:global(.slide .content .prose .project-list .project-mark svg) {
		display: block;
	}
	:global(.slide .content .prose .project-list .project-name) {
		font-size: clamp(1rem, 1.7vw, 1.32rem);
		font-weight: 720;
		line-height: 1.1;
		letter-spacing: 0;
		color: var(--deck-text);
	}
	:global(.slide .content .prose .project-list .project-owner),
	:global(.slide .content .prose .project-list .project-slash) {
		color: var(--deck-muted);
		font-weight: 600;
	}
	:global(.slide .content .prose .project-list .project-lang) {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		flex: 0 0 auto;
		color: var(--deck-muted);
		font-size: clamp(0.8rem, 1.1vw, 0.94rem);
		font-variant-numeric: tabular-nums;
	}
	:global(.slide .content .prose .project-list .lang-dot) {
		width: 0.7rem;
		height: 0.7rem;
		border-radius: 999px;
		background: var(--lang, var(--deck-accent));
		box-shadow: 0 0 0 3px color-mix(in oklch, var(--lang, var(--deck-accent)) 16%, transparent);
	}
	:global(.slide .content .prose .project-list .project-desc) {
		max-width: 96ch;
		font-size: clamp(0.84rem, 1.1vw, 1rem);
		line-height: 1.34;
		color: var(--deck-muted);
		text-wrap: pretty;
	}
	:global(.slide .content .prose .project-list .project-desc strong) {
		color: var(--deck-text);
		font-weight: 700;
	}
	/* "Is Claude Code an RLM": two-column Q4-No / Q2-Yes verdict comparison with tweet cards. */
	:global(.slide .content .prose .verdict-compare) {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: clamp(1.4rem, 4vw, 3.2rem);
		align-items: center;
		margin-top: clamp(1.2rem, 3vw, 2rem);
	}
	:global(.slide .content .prose .verdict) {
		display: grid;
		gap: clamp(0.7rem, 1.6vw, 1.1rem);
		justify-items: center;
	}
	:global(.slide .content .prose .verdict-call) {
		margin: 0;
		font-size: clamp(1.5rem, 1rem + 2vw, 2.6rem);
		font-weight: 800;
		line-height: 1;
	}
	:global(.slide .content .prose .verdict-call--no) {
		color: var(--deck-muted);
	}
	:global(.slide .content .prose .verdict-call--yes) {
		color: var(--deck-accent);
	}
	/* Date caption sits below the tweet screenshot. */
	:global(.slide .content .prose .verdict-when) {
		margin: 0;
		font-size: clamp(0.78rem, 0.7rem + 0.3vw, 1rem);
		font-weight: 600;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--deck-muted);
	}
	:global(.slide .content .prose .verdict-tweet) {
		display: block;
		text-decoration: none;
	}
	:global(.slide .content .prose .verdict-tweet img) {
		display: block;
		height: min(54dvh, 520px);
		width: auto;
		max-width: 100%;
		border-radius: 8px;
		border: 1px solid color-mix(in oklch, var(--deck-text) 18%, transparent);
		box-shadow: 0 28px 70px -38px color-mix(in oklch, var(--deck-text) 55%, transparent);
		transition:
			transform 0.16s ease,
			border-color 0.16s ease;
	}
	:global(.slide .content .prose .verdict-tweet:hover img) {
		transform: translateY(-2px);
		border-color: color-mix(in oklch, var(--deck-accent) 45%, var(--deck-text));
	}
	:global(.slide .content .prose .verdict-tweet:focus-visible) {
		outline: 2px solid var(--deck-accent);
		outline-offset: 4px;
		border-radius: 8px;
	}
	:global(.slide .content .prose .paper-preview) {
		display: block;
		overflow: hidden;
		border-radius: 8px;
		border: 1px solid color-mix(in oklch, var(--deck-text) 18%, transparent);
		background: color-mix(in oklch, var(--deck-text) 4%, var(--deck-bg));
		text-decoration: none;
		box-shadow: 0 28px 70px -38px color-mix(in oklch, var(--deck-text) 55%, transparent);
	}
	:global(.slide .content .prose .paper-preview img) {
		display: block;
		width: 100%;
		max-height: min(58dvh, 520px);
		object-fit: cover;
		object-position: top center;
		background: white;
	}
	:global(.slide .content .prose .paper-preview span) {
		display: block;
		padding: 0.72rem 0.9rem;
		font-size: clamp(0.78rem, 0.72rem + 0.22vw, 0.92rem);
		font-weight: 750;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--deck-accent);
	}
	:global(.slide .content .prose ul) {
		margin: clamp(1.3rem, 3.5vw, 2.2rem) 0 0;
		padding: 0;
		list-style: none;
		display: grid;
		gap: clamp(1rem, 2.6vw, 1.5rem);
	}
	:global(.slide .content .prose li) {
		font-size: var(--fs-body);
		color: var(--deck-muted);
		line-height: 1.4;
	}
	:global(.slide .content .prose li strong) {
		color: var(--deck-accent);
		font-weight: 700;
	}
	:global(.slide .content .prose blockquote) {
		margin: 0;
		padding: 0;
		border: 0;
		font-size: var(--fs-quote);
		font-weight: 600;
		line-height: 1.18;
		color: var(--deck-text);
	}
	:global(.slide .content .prose strong) {
		color: var(--deck-text);
		font-weight: 700;
	}
	:global(.slide .content .prose .bridge-quotes blockquote strong) {
		color: var(--deck-accent);
		font-weight: 800;
	}
	:global(.slide .content .prose em) {
		font-style: normal;
		color: var(--deck-accent);
	}
	:global(.slide .content .prose a:not([data-slot='button'])) {
		color: var(--deck-text);
		text-decoration: underline;
		text-decoration-color: color-mix(in srgb, var(--deck-accent) 45%, transparent);
		text-decoration-thickness: 1.5px;
		text-underline-offset: 3px;
		transition: color 0.15s ease;
	}
	:global(.slide .content .prose a:not([data-slot='button']):hover) {
		color: var(--deck-accent);
		text-decoration-color: var(--deck-accent);
	}
	:global(.slide .content .prose a.url-preview:not([data-slot='button'])),
	:global(.slide .content .prose a.evidence-card:not([data-slot='button'])),
	:global(.slide .content .prose a.workflow-article:not([data-slot='button'])),
	:global(.slide .content .prose a.applied-example:not([data-slot='button'])),
	:global(.slide .content .prose a.prose-program:not([data-slot='button'])) {
		color: inherit;
		text-decoration: none;
	}
	:global(.slide .content .prose a.url-preview:not([data-slot='button']):hover),
	:global(.slide .content .prose a.evidence-card:not([data-slot='button']):hover),
	:global(.slide .content .prose a.workflow-article:not([data-slot='button']):hover),
	:global(.slide .content .prose a.applied-example:not([data-slot='button']):hover),
	:global(.slide .content .prose a.prose-program:not([data-slot='button']):hover) {
		color: inherit;
		text-decoration: none;
	}
	@media (max-width: 760px) {
		:global(.slide .content .prose p) {
			line-height: 1.34;
		}
		:global(.slide .content .prose ul) {
			gap: 0.7rem;
			margin-top: 0.85rem;
		}
		:global(.slide .content .prose .bridge-quotes) {
			width: 100%;
			gap: 1.35rem;
		}
		:global(.slide .content .prose .bridge-quotes blockquote p) {
			font-size: 2.15rem;
			line-height: 1.16;
		}
		:global(.slide .content .prose .bridge-slide-layout) {
			gap: 0.8rem;
		}
		:global(.slide .content .prose .bridge-slide-layout .bridge-quotes) {
			gap: 0.5rem;
		}
		:global(.slide .content .prose .bridge-slide-layout .bridge-quotes blockquote p) {
			font-size: clamp(1.02rem, 4.6vw, 1.45rem);
			line-height: 1.1;
		}
		:global(.slide .content .prose .bridge-tree-comparison) {
			grid-template-columns: 1fr;
			gap: 0.72rem;
			align-items: start;
			width: 100%;
		}
		:global(.slide .content .prose .bridge-tree-panel) {
			gap: 0.44rem;
		}
		:global(.slide .content .prose .bridge-tree-panel h2) {
			font-size: clamp(0.84rem, 3.4vw, 1rem);
			line-height: 1;
		}
		:global(.slide .content .prose .url-previews),
		:global(.slide .content .prose .evidence-split),
		:global(.slide .content .prose .workflow-showcase),
		:global(.slide .content .prose .repo-preview-grid),
		:global(.slide .content .prose .prose-program-grid),
		:global(.slide .content .prose .ftw-takeaways),
		:global(.slide .content .prose .verdict-compare),
		:global(.slide .content .prose .paper-split) {
			grid-template-columns: 1fr;
		}
		:global(.slide .content .prose .ftw-takeaways) {
			gap: 1rem;
		}
		:global(.slide .content .prose .ftw-lockup) {
			min-height: 14rem;
			padding: 1rem;
		}
		:global(.slide .content .prose .ftw-lockup h1) {
			font-size: clamp(1.55rem, 9vw, 2.35rem);
			line-height: 1;
		}
		:global(.slide .content .prose .ftw-lockup h1 span) {
			max-width: 12ch;
		}
		:global(.slide .content .prose .ftw-lockup h1 strong) {
			font-size: clamp(4.8rem, 30vw, 7.1rem);
		}
		:global(.slide .content .prose .ftw-proof p) {
			grid-template-columns: 1fr;
			gap: 0.42rem;
			padding: 0.72rem 0;
			border-top-width: 1px;
		}
		:global(.slide .content .prose .ftw-proof p:last-child) {
			border-bottom-width: 1px;
		}
		:global(.slide .content .prose .ftw-proof strong) {
			font-size: 1.18rem;
			line-height: 1.08;
		}
		:global(.slide .content .prose .ftw-proof span) {
			font-size: 0.86rem;
			line-height: 1.24;
		}
		:global(.slide .content .prose .repo-preview-grid) {
			gap: 0.58rem;
			margin-top: 0.75rem;
		}
		:global(.slide .content .prose .repo-preview-grid .repo-title) {
			font-size: 1.02rem;
		}
		:global(.slide .content .prose .repo-preview-grid .repo-description) {
			margin-top: 0.28rem;
			font-size: 0.74rem;
			line-height: 1.28;
		}
		:global(.slide .content .prose .repo-preview-grid .repo-meta-item) {
			font-size: 0.66rem;
		}
		:global(.slide .content .prose .workflow-showcase) {
			grid-template-areas:
				'copy'
				'article'
				'examples';
			gap: 0.68rem;
		}
		:global(.slide .content .prose .workflow-showcase .workflow-example-links) {
			grid-template-columns: 1fr;
			gap: 0.58rem;
		}
		:global(.slide .content .prose .workflow-article img) {
			height: auto;
			max-height: 26dvh;
		}
		:global(.slide .content .prose .workflow-copy p) {
			font-size: 0.92rem;
			line-height: 1.28;
		}
		:global(.slide .content .prose .workflow-example-links .url-preview) {
			min-height: 0;
			padding: 0.55rem;
		}
		:global(.slide .content .prose .workflow-example-links .preview-caption) {
			gap: 0.16rem;
		}
		:global(.slide .content .prose .prose-program) {
			min-height: 0;
			gap: 0.48rem;
			padding: 0.8rem;
		}
		:global(.slide .content .prose .prose-program-grid) {
			gap: 0.72rem;
			margin-top: 0.85rem;
		}
		:global(.slide .content .prose .prose-program-label) {
			font-size: 0.68rem;
		}
		:global(.slide .content .prose .prose-program strong) {
			font-size: 1.05rem;
		}
		:global(.slide .content .prose .prose-program-copy) {
			font-size: 0.84rem;
			line-height: 1.28;
		}
		:global(.slide .content .prose .prose-program-points) {
			gap: 0.34rem;
		}
		:global(.slide .content .prose .prose-program-points li) {
			padding-left: 0.78rem;
			font-size: 0.78rem;
			line-height: 1.23;
		}
		:global(.slide .content .prose .prose-program-points li::before) {
			top: 0.54em;
			width: 0.26rem;
			height: 0.26rem;
		}
		:global(.slide .content .prose .prose-program pre) {
			padding: 0.58rem;
			font-size: 0.66rem;
			line-height: 1.3;
		}
		:global(.slide .content .prose .verdict-compare) {
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: 0.72rem;
			align-items: center;
			margin-top: 0.72rem;
		}
		:global(.slide .content .prose .verdict) {
			gap: 0.36rem;
		}
		:global(.slide .content .prose .verdict-call) {
			font-size: 1.18rem;
		}
		:global(.slide .content .prose .verdict-when) {
			font-size: 0.56rem;
			letter-spacing: 0.12em;
		}
		:global(.slide .content .prose .verdict-tweet) {
			display: grid;
			place-items: center;
			width: 100%;
			height: min(38dvh, 320px);
			overflow: hidden;
			border-radius: 8px;
		}
		:global(.slide .content .prose .verdict-tweet img) {
			height: auto;
			width: 100%;
			max-width: none;
			max-height: 100%;
			object-fit: contain;
		}
		:global(.slide .content .prose .evidence-card img) {
			max-height: 32dvh;
		}
		:global(.slide .content .prose .outcomes-progression) {
			width: min(340px, 82vw, calc(10dvh * 2048 / 499));
		}
		:global(.slide[data-label='We all want outcomes'] .content) {
			min-height: calc(100dvh - (var(--pad) * 2) - 32px);
		}
		:global(.slide .content .prose .rlm-definition-layout) {
			gap: 0.72rem;
			min-height: auto;
		}
		:global(.slide .content .prose .rlm-tree-example) {
			font-size: clamp(0.56rem, 2.15vw, 0.68rem);
			line-height: 1.12;
		}
	}
	@media (max-width: 380px) and (max-height: 760px) {
		:global(.slide .content .prose h1) {
			margin-bottom: 0.62rem;
			line-height: 1;
		}
		:global(.slide .content .prose h2) {
			margin-bottom: 0.62rem;
			line-height: 1.04;
		}
		:global(.slide .content .prose p) {
			margin-top: 0.55rem;
			line-height: 1.24;
		}
		:global(.slide .content .prose ul) {
			gap: 0.42rem;
			margin-top: 0.58rem;
		}
		:global(.slide .content .prose .url-previews) {
			gap: 0.45rem;
			margin-top: 0.5rem;
		}
		:global(.slide .content .prose .url-preview) {
			padding: 0.48rem;
		}
		:global(.slide .content .prose .url-preview img) {
			height: 74px;
		}
		:global(.slide .content .prose .url-preview .preview-caption) {
			gap: 0.16rem;
			margin-top: 0.3rem;
		}
		:global(.slide .content .prose .url-preview .preview-source) {
			font-size: 0.54rem;
			letter-spacing: 0.08em;
		}
		:global(.slide .content .prose .url-preview strong) {
			font-size: 0.8rem;
			line-height: 1.08;
		}
		:global(.slide .content .prose .url-preview .preview-note) {
			font-size: 0.68rem;
			line-height: 1.18;
		}
		:global(.slide .content .prose .workflow-showcase) {
			gap: 0.48rem;
		}
		:global(.slide .content .prose .workflow-article img) {
			max-height: 18dvh;
		}
		:global(.slide .content .prose .workflow-article span) {
			padding: 0.42rem 0.55rem;
			font-size: 0.55rem;
		}
		:global(.slide .content .prose .workflow-example-links .url-preview) {
			padding: 0.42rem;
		}
		:global(.slide .content .prose .evidence-split) {
			gap: 0.62rem;
		}
		:global(.slide .content .prose .repo-preview-grid) {
			gap: 0.46rem;
			margin-top: 0.52rem;
		}
		:global(.slide .content .prose .prose-program-grid) {
			gap: 0.48rem;
			margin-top: 0.52rem;
		}
		:global(.slide .content .prose .prose-program) {
			gap: 0.3rem;
			padding: 0.55rem;
		}
		:global(.slide .content .prose .prose-program-label) {
			font-size: 0.56rem;
		}
		:global(.slide .content .prose .prose-program strong) {
			font-size: 0.86rem;
			line-height: 1.06;
		}
		:global(.slide .content .prose .prose-program-points) {
			gap: 0.2rem;
		}
		:global(.slide .content .prose .prose-program-points li) {
			padding-left: 0.62rem;
			font-size: 0.68rem;
			line-height: 1.16;
		}
		:global(.slide .content .prose .prose-program pre) {
			padding: 0.38rem;
			font-size: 0.54rem;
			line-height: 1.14;
		}
	}
	@media (min-width: 761px) and (max-height: 900px) {
		:global(.slide .content .prose h1) {
			margin-bottom: 0.82rem;
			line-height: 1.02;
		}
		:global(.slide .content .prose h2) {
			margin-bottom: 0.82rem;
			line-height: 1.05;
		}
		:global(.slide .content .prose p) {
			margin-top: 0.72rem;
			line-height: 1.28;
		}
		:global(.slide .content .prose ul) {
			gap: 0.62rem;
			margin-top: 0.78rem;
		}
		:global(.slide .content .prose hr) {
			margin: 1.1rem 0 1.15rem;
		}
		:global(.slide .content .prose .url-previews) {
			gap: 0.72rem;
			margin-top: 0.75rem;
		}
		:global(.slide .content .prose .url-preview) {
			padding: 0.62rem;
		}
		:global(.slide .content .prose .url-preview img) {
			height: clamp(92px, 16dvh, 145px);
		}
		:global(.slide .content .prose .url-preview .preview-caption) {
			gap: 0.24rem;
			margin-top: 0.42rem;
		}
		:global(.slide .content .prose .url-preview .preview-source) {
			font-size: 0.64rem;
			letter-spacing: 0.08em;
		}
		:global(.slide .content .prose .url-preview strong) {
			font-size: 0.9rem;
			line-height: 1.08;
		}
		:global(.slide .content .prose .url-preview .preview-note) {
			font-size: 0.76rem;
			line-height: 1.22;
		}
		:global(.slide .content .prose .evidence-split) {
			gap: 1.05rem;
			align-items: center;
		}
		:global(.slide .content .prose .evidence-card img) {
			max-height: 44dvh;
		}
		:global(.slide .content .prose .repo-preview-grid) {
			gap: 0.72rem;
			margin-top: 0.76rem;
		}
		:global(.slide .content .prose .workflow-showcase) {
			gap: 0.75rem 1rem;
		}
		:global(.slide .content .prose .workflow-copy h2) {
			margin-bottom: 0.55rem;
		}
		:global(.slide .content .prose .workflow-copy p) {
			font-size: 0.98rem;
			line-height: 1.25;
		}
		:global(.slide .content .prose .workflow-article img) {
			max-height: 28dvh;
		}
		:global(.slide .content .prose .workflow-article span) {
			padding: 0.5rem 0.65rem;
			font-size: 0.6rem;
		}
		:global(.slide .content .prose .workflow-showcase .workflow-example-links) {
			gap: 0.7rem;
		}
		:global(.slide .content .prose .workflow-example-links .url-preview) {
			min-height: 0;
			padding: 0.65rem;
		}
		:global(.slide .content .prose .verdict-compare) {
			gap: clamp(1rem, 3vw, 2rem);
			margin-top: 0.85rem;
		}
		:global(.slide .content .prose .verdict) {
			gap: 0.5rem;
		}
		:global(.slide .content .prose .verdict-call) {
			font-size: clamp(1.25rem, 1rem + 1.2vw, 1.8rem);
		}
		:global(.slide .content .prose .verdict-tweet img) {
			height: min(46dvh, 410px);
			max-height: none;
		}
		:global(.slide .content .prose .verdict-when) {
			font-size: 0.64rem;
		}
		:global(.slide .content .prose .prose-program-grid) {
			gap: 0.72rem;
			margin-top: 0.7rem;
		}
		:global(.slide .content .prose .prose-program) {
			gap: 0.38rem;
			padding: 0.72rem;
		}
		:global(.slide .content .prose .prose-program-label) {
			font-size: 0.62rem;
		}
		:global(.slide .content .prose .prose-program strong) {
			font-size: 0.92rem;
		}
		:global(.slide .content .prose .prose-program-points) {
			gap: 0.25rem;
		}
		:global(.slide .content .prose .prose-program-points li) {
			font-size: 0.72rem;
			line-height: 1.18;
		}
		:global(.slide .content .prose .prose-program pre) {
			padding: 0.46rem;
			font-size: 0.58rem;
			line-height: 1.18;
		}
	}
	:global(.slide .content .prose .mismanaged-previews .url-preview img) {
		height: clamp(185px, 28dvh, 295px);
	}

	@media (min-width: 761px) and (max-height: 900px) {
		:global(.slide .content .prose .mismanaged-previews .url-preview img) {
			height: clamp(165px, 26dvh, 235px);
		}
	}

	@media (width <= 760px) {
		:global(.slide .content .prose .mismanaged-previews .url-preview img) {
			height: clamp(108px, 18dvh, 150px);
		}
	}

	@media (max-width: 380px) and (max-height: 760px) {
		:global(.slide .content .prose .mismanaged-previews .url-preview img) {
			height: 94px;
		}
	}
</style>

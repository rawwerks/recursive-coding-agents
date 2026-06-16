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
	:global(.slide .content .prose .nowrap) {
		white-space: nowrap;
	}
	:global(.slide .content .prose .paper-split) {
		display: grid;
		grid-template-columns: minmax(0, 0.92fr) minmax(320px, 0.78fr);
		gap: clamp(1.5rem, 4vw, 3rem);
		align-items: center;
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
		height: min(62dvh, 600px);
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
	@media (max-width: 760px) {
		:global(.slide .content .prose .bridge-quotes) {
			width: 100%;
			gap: 1.35rem;
		}
		:global(.slide .content .prose .bridge-quotes blockquote p) {
			font-size: 2.15rem;
			line-height: 1.16;
		}
		:global(.slide .content .prose .url-previews),
		:global(.slide .content .prose .evidence-split),
		:global(.slide .content .prose .repo-preview-grid),
		:global(.slide .content .prose .verdict-compare),
		:global(.slide .content .prose .paper-split) {
			grid-template-columns: 1fr;
		}
		:global(.slide .content .prose .verdict-tweet img) {
			height: auto;
			width: 100%;
			max-width: 26rem;
			max-height: 52dvh;
		}
		:global(.slide .content .prose .evidence-card img) {
			max-height: 38dvh;
		}
	}
</style>

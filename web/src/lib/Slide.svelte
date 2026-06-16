<script lang="ts">
	import type { Snippet } from 'svelte';
	import { getDeckRegistry } from './deck';

	type SlideVariant = 'default' | 'title' | 'section' | 'split' | 'quote' | 'code' | 'grid' | 'image';

	interface Props {
		/** Short name used for the dot's accessible label (e.g. "Intro"). */
		label?: string;
		/** Use the hair-lighter alternate background for visual separation. */
		alt?: boolean;
		/** Basic layout preset for common deck sections. */
		variant?: SlideVariant;
		/** Horizontal alignment of the content block. */
		align?: 'left' | 'center';
		/** Optional custom background for this slide (any CSS color/gradient). */
		background?: string;
		/** Optional delayed bottom-center cue that links to the next slide. */
		scrollCueHref?: string;
		children: Snippet;
	}

	let {
		label,
		alt = false,
		variant = 'default',
		align,
		background,
		scrollCueHref,
		children
	}: Props = $props();

	const centeredVariants: SlideVariant[] = ['title', 'section', 'quote'];
	let effectiveAlign = $derived(
		align ?? (centeredVariants.includes(variant) ? 'center' : 'left')
	);

	// Claim a stable 1-based id at init (runs on server + client in order).
	const index = getDeckRegistry().register();

	function followScrollCue(event: MouseEvent) {
		if (!scrollCueHref) return;
		const target = document.querySelector<HTMLElement>(scrollCueHref);
		if (!target) return;

		event.preventDefault();
		const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		target.scrollIntoView({
			behavior: prefersReducedMotion ? 'auto' : 'smooth',
			block: 'start'
		});
		history.replaceState(null, '', scrollCueHref);
	}
</script>

<section
	id={`slide-${index}`}
	class="slide"
	class:alt
	data-align={effectiveAlign}
	data-variant={variant}
	data-label={label ?? `Slide ${index}`}
	style={background ? `--slide-bg:${background}` : undefined}
	aria-label={label ?? `Slide ${index}`}
>
	<div class="content">
		{@render children()}
	</div>
	{#if scrollCueHref}
		<a
			class="scroll-cue"
			href={scrollCueHref}
			aria-label="Scroll to the next slide"
			onclick={followScrollCue}
		>
			<span aria-hidden="true"></span>
		</a>
	{/if}
</section>

<style>
	.slide {
		/* Full-screen slide that participates in the parent's vertical scroll-snap.
		   100dvh tracks the *dynamic* viewport so mobile browser chrome doesn't
		   crop the content. */
		min-height: 100dvh;
		scroll-snap-align: start;
		scroll-snap-stop: always;

		position: relative;
		display: flex;
		align-items: center; /* vertical centering */
		padding: var(--pad);
		background: var(--slide-bg, var(--deck-bg));
	}

	.slide.alt {
		background: var(--slide-bg, var(--deck-bg-alt));
	}

	.content {
		width: 100%;
		max-width: var(--maxw);
		margin: 0 auto;
		text-align: left;

		/* Subtle fade + rise as the slide enters, using a native CSS
		   scroll-driven animation (no JS). The end-state is the resting layout,
		   so browsers without scroll-timeline support — and no-JS visitors —
		   simply see the finished slide. */
		animation: rise 0.6s cubic-bezier(0.2, 0.7, 0.2, 1) both;
		animation-timeline: view();
		animation-range: entry 0% cover 28%;
	}

	.slide[data-align='center'] .content {
		text-align: center;
	}

	@keyframes rise {
		from {
			opacity: 0;
			transform: translateY(28px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.scroll-cue {
		position: absolute;
		left: 50%;
		bottom: max(clamp(1rem, 4dvh, 2.2rem), env(safe-area-inset-bottom));
		z-index: 2;
		display: grid;
		place-items: center;
		width: clamp(2.45rem, 6vw, 3.25rem);
		height: clamp(2.45rem, 6vw, 3.25rem);
		border: 1px solid color-mix(in oklch, var(--deck-text) 24%, transparent);
		border-radius: 999px;
		background: color-mix(in oklch, var(--deck-bg) 82%, transparent);
		color: var(--deck-text);
		opacity: 0;
		transform: translateX(-50%) translateY(0.55rem) scale(0.94);
		text-decoration: none;
		animation:
			cue-pop 0.42s cubic-bezier(0.2, 0.8, 0.2, 1) 2.4s forwards,
			cue-bob 1.65s cubic-bezier(0.4, 0, 0.2, 1) 2.95s infinite;
	}

	.scroll-cue span {
		width: 0.72rem;
		height: 0.72rem;
		margin-top: -0.12rem;
		border-right: 2px solid currentColor;
		border-bottom: 2px solid currentColor;
		transform: rotate(45deg);
	}

	.scroll-cue:hover {
		border-color: color-mix(in oklch, var(--deck-text) 48%, transparent);
		background: color-mix(in oklch, var(--deck-text) 8%, var(--deck-bg));
	}

	.scroll-cue:focus-visible {
		opacity: 1;
		outline: 2px solid var(--deck-accent);
		outline-offset: 4px;
		transform: translateX(-50%) translateY(0) scale(1);
	}

	@keyframes cue-pop {
		to {
			opacity: 0.92;
			transform: translateX(-50%) translateY(0) scale(1);
		}
	}

	@keyframes cue-bob {
		0%,
		100% {
			transform: translateX(-50%) translateY(0) scale(1);
		}
		50% {
			transform: translateX(-50%) translateY(0.28rem) scale(1);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.content {
			animation: none;
		}
		.scroll-cue {
			opacity: 0.92;
			transform: translateX(-50%) translateY(0) scale(1);
			animation: none;
		}
	}

	@media (width <= 760px) {
		.scroll-cue {
			bottom: max(0.8rem, env(safe-area-inset-bottom));
			width: 2.35rem;
			height: 2.35rem;
		}
	}
</style>

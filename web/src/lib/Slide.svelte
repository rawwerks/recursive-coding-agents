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
		children: Snippet;
	}

	let {
		label,
		alt = false,
		variant = 'default',
		align,
		background,
		children
	}: Props = $props();

	const centeredVariants: SlideVariant[] = ['title', 'section', 'quote'];
	let effectiveAlign = $derived(
		align ?? (centeredVariants.includes(variant) ? 'center' : 'left')
	);

	// Claim a stable 1-based id at init (runs on server + client in order).
	const index = getDeckRegistry().register();
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
</section>

<style>
	.slide {
		/* Full-screen slide that participates in the parent's vertical scroll-snap.
		   100dvh tracks the *dynamic* viewport so mobile browser chrome doesn't
		   crop the content. */
		min-height: 100dvh;
		scroll-snap-align: start;
		scroll-snap-stop: always;

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

	@media (prefers-reduced-motion: reduce) {
		.content {
			animation: none;
		}
	}
</style>

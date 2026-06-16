<script lang="ts">
	import type { Snippet } from 'svelte';
	import { onMount } from 'svelte';
	import { createDeckRegistry } from './deck';

	interface Props {
		/** Accessible label for the deck landmark. */
		label?: string;
		children: Snippet;
	}

	let { label = 'Presentation', children }: Props = $props();

	// Publish the slide registry so <Slide> children can claim ids during render.
	createDeckRegistry();

	let deck = $state<HTMLElement | null>(null);
	let active = $state(0);
	let mounted = $state(false);
	// Built once on mount from the rendered DOM (label + count) — the dots are a
	// client-only progressive enhancement, so this avoids any hydration mismatch.
	let slides = $state<{ label: string }[]>([]);

	const reduceMotion = () =>
		typeof window !== 'undefined' &&
		window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	/** Scroll to a slide by 0-based index, clamped to range. */
	function goTo(index: number) {
		const i = Math.max(0, Math.min(slides.length - 1, index));
		const target = deck?.querySelector<HTMLElement>(`#slide-${i + 1}`);
		target?.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' });
	}

	/** Keyboard nav: arrows + PageUp/PageDown + Home/End + Space (Shift+Space back). */
	function onKeydown(event: KeyboardEvent) {
		// Don't hijack keys while the user is typing in a form field or editing text.
		const t = event.target as HTMLElement | null;
		if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;

		switch (event.key) {
			case 'ArrowDown':
			case 'PageDown':
				event.preventDefault();
				goTo(active + 1);
				break;
			case 'ArrowUp':
			case 'PageUp':
				event.preventDefault();
				goTo(active - 1);
				break;
			case 'Home':
				event.preventDefault();
				goTo(0);
				break;
			case 'End':
				event.preventDefault();
				goTo(slides.length - 1);
				break;
			case ' ':
				event.preventDefault();
				goTo(active + (event.shiftKey ? -1 : 1));
				break;
		}
	}

	onMount(() => {
		mounted = true;
		if (!deck) return;
		const sections = Array.from(deck.querySelectorAll<HTMLElement>('.slide'));
		slides = sections.map((s, i) => ({ label: s.dataset.label || `Slide ${i + 1}` }));

		// Track the active slide with an IntersectionObserver instead of scroll
		// math: robust to momentum scrolling, resize, and deep-link landings.
		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						const idx = sections.indexOf(entry.target as HTMLElement);
						if (idx !== -1) active = idx;
					}
				}
			},
			{ root: deck, threshold: 0.6 }
		);
		for (const s of sections) observer.observe(s);

		// Honour an initial #slide-N deep link once mounted.
		const hash = window.location.hash.match(/^#slide-(\d+)$/);
		if (hash) {
			const idx = Number(hash[1]) - 1;
			if (idx >= 0 && idx < sections.length) {
				active = idx;
				requestAnimationFrame(() => goTo(idx)); // defer until layout settles
			}
		}

		return () => observer.disconnect();
	});
</script>

<svelte:window on:keydown={onKeydown} />

<main class="deck" bind:this={deck} aria-label={label}>
	{@render children()}
</main>

{#if mounted}
	<nav class="dots" aria-label="Slide navigation">
		{#each slides as s, i (i)}
			<a
				class="dot"
				class:active={active === i}
				href={`#slide-${i + 1}`}
				aria-label={`Go to slide ${i + 1}: ${s.label}`}
				aria-current={active === i ? 'true' : undefined}
				onclick={(e) => {
					e.preventDefault();
					goTo(i);
				}}
			>
				<span class="dot-visual"></span>
			</a>
		{/each}
	</nav>
{/if}

<style>
	.deck {
		height: 100dvh;
		overflow-y: scroll;
		scroll-snap-type: y mandatory;
		scroll-behavior: smooth;
		/* Keep snap momentum contained to the deck. */
		overscroll-behavior-y: contain;
	}

	/* ---- Position indicator (fixed, top-right) ---- */
	.dots {
		position: fixed;
		top: clamp(1rem, 3vw, 1.8rem);
		right: clamp(0.4rem, 2vw, 1.1rem);
		z-index: 10;
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}

	/* The anchor is a generous tap target; the visible dot lives inside it. */
	.dot {
		display: grid;
		place-items: center;
		width: 40px;
		height: 38px;
		border-radius: 10px;
		-webkit-tap-highlight-color: transparent;
	}

	.dot-visual {
		width: 0.6rem;
		height: 0.6rem;
		border-radius: 999px;
		background: var(--deck-muted);
		opacity: 0.35;
		transition:
			opacity 0.2s ease,
			background 0.2s ease,
			transform 0.2s ease;
	}

	.dot:hover .dot-visual {
		opacity: 0.7;
	}

	.dot.active .dot-visual {
		background: var(--deck-accent);
		opacity: 1;
		transform: scale(1.3);
	}

	.dot:focus-visible {
		outline: 2px solid var(--deck-accent);
		outline-offset: 2px;
	}

	@media (prefers-reduced-motion: reduce) {
		.deck {
			scroll-behavior: auto;
		}
		.dot-visual {
			transition: none;
		}
	}
</style>

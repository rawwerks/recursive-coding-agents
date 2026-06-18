<script lang="ts">
	import { replaceState } from '$app/navigation';
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
	let nextCueVisible = $state(false);
	// Built once on mount from the rendered DOM (label + count) — the dots are a
	// client-only progressive enhancement, so this avoids any hydration mismatch.
	let slides = $state<{ label: string }[]>([]);
	let nextCueTimer: ReturnType<typeof setTimeout> | null = null;
	const firstSlideNextCueDelay = 5_000;
	const defaultNextCueDelay = 10_000;

	const reduceMotion = () =>
		typeof window !== 'undefined' &&
		window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	const hasNextSlide = $derived(mounted && active < slides.length - 1);
	const nextSlideHref = $derived(hasNextSlide ? `#slide-${active + 2}` : undefined);
	const nextSlideLabel = $derived(slides[active + 1]?.label ?? `Slide ${active + 2}`);

	function clearNextCueTimer() {
		if (!nextCueTimer) return;
		clearTimeout(nextCueTimer);
		nextCueTimer = null;
	}

	function scheduleNextCueForSlide(slideIndex = active) {
		clearNextCueTimer();
		nextCueVisible = false;
		const slideCount = slides.length;
		if (!mounted || slideCount === 0 || slideIndex >= slideCount - 1) return;
		const nextCueDelay = slideIndex === 0 ? firstSlideNextCueDelay : defaultNextCueDelay;

		nextCueTimer = setTimeout(() => {
			nextCueVisible = mounted && active === slideIndex && slides.length === slideCount;
			nextCueTimer = null;
		}, nextCueDelay);
	}

	/** Scroll to a slide by 0-based index, clamped to range. */
	function goTo(index: number) {
		const i = Math.max(0, Math.min(slides.length - 1, index));
		const target = deck?.querySelector<HTMLElement>(`#slide-${i + 1}`);
		target?.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' });
		if (target && window.location.hash !== `#slide-${i + 1}`) {
			replaceState(`#slide-${i + 1}`, {});
		}
	}

	function goToNext(event: MouseEvent) {
		event.preventDefault();
		clearNextCueTimer();
		nextCueVisible = false;
		goTo(active + 1);
	}

	function slideIndexForNumberKey(event: KeyboardEvent) {
		if (event.altKey || event.ctrlKey || event.metaKey) return null;
		if (/^[1-9]$/.test(event.key)) return Number(event.key) - 1;
		if (event.key === '0') return 9;
		const codeMatch = /^(?:Digit|Numpad)([0-9])$/.exec(event.code);
		if (codeMatch) {
			return codeMatch[1] === '0' ? 9 : Number(codeMatch[1]) - 1;
		}
		return null;
	}

	/** Keyboard nav: arrows + PageUp/PageDown + Home/End + Space + number keys. */
	function onKeydown(event: KeyboardEvent) {
		// Don't hijack keys while the user is typing in a form field or editing text.
		const t = event.target as HTMLElement | null;
		if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;

		const numberIndex = slideIndexForNumberKey(event);
		if (numberIndex !== null && numberIndex < slides.length) {
			event.preventDefault();
			goTo(numberIndex);
			return;
		}

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

		return () => {
			observer.disconnect();
			clearNextCueTimer();
		};
	});

	$effect(() => {
		const slideIndex = active;
		const slideCount = slides.length;
		if (!mounted || slideCount === 0) return;
		scheduleNextCueForSlide(slideIndex);
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

{#if hasNextSlide && nextSlideHref}
	<a
		class="next-slide-cue"
		class:visible={nextCueVisible}
		href={nextSlideHref}
		aria-label={`Go to next slide: ${nextSlideLabel}`}
		onclick={goToNext}
	>
		<span aria-hidden="true"></span>
	</a>
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
		top: 50%;
		right: clamp(0rem, 0.45vw, 0.45rem);
		z-index: 10;
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		transform: translateY(-50%);
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

	.next-slide-cue {
		position: fixed;
		left: 50%;
		bottom: max(clamp(1rem, 4dvh, 2.2rem), env(safe-area-inset-bottom));
		z-index: 12;
		display: grid;
		place-items: center;
		width: clamp(2.45rem, 6vw, 3.25rem);
		height: clamp(2.45rem, 6vw, 3.25rem);
		border: 1px solid color-mix(in oklch, var(--deck-text) 24%, transparent);
		border-radius: 999px;
		background: color-mix(in oklch, var(--deck-bg) 82%, transparent);
		color: var(--deck-text);
		opacity: 0;
		pointer-events: none;
		transform: translateX(-50%) translateY(0.55rem) scale(0.94);
		text-decoration: none;
		transition:
			opacity 0.28s ease,
			transform 0.28s ease,
			border-color 0.2s ease,
			background 0.2s ease;
	}

	.next-slide-cue.visible {
		opacity: 0.92;
		pointer-events: auto;
		transform: translateX(-50%) translateY(0) scale(1);
		animation: cue-bob 1.65s cubic-bezier(0.4, 0, 0.2, 1) 0.3s infinite;
	}

	.next-slide-cue span {
		width: 0.72rem;
		height: 0.72rem;
		margin-top: -0.12rem;
		border-right: 2px solid currentColor;
		border-bottom: 2px solid currentColor;
		transform: rotate(45deg);
	}

	.next-slide-cue:hover {
		border-color: color-mix(in oklch, var(--deck-text) 48%, transparent);
		background: color-mix(in oklch, var(--deck-text) 8%, var(--deck-bg));
	}

	.next-slide-cue:focus-visible {
		opacity: 1;
		outline: 2px solid var(--deck-accent);
		outline-offset: 4px;
		pointer-events: auto;
		transform: translateX(-50%) translateY(0) scale(1);
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
		.deck {
			scroll-behavior: auto;
		}
		.dot-visual {
			transition: none;
		}
		.next-slide-cue,
		.next-slide-cue.visible {
			animation: none;
			transition: none;
		}
	}

	@media (width <= 760px) {
		.dots {
			right: calc(env(safe-area-inset-right) - 0.28rem);
		}

		.dot {
			width: 24px;
			height: 32px;
		}

		.dot-visual {
			width: 0.52rem;
			height: 0.52rem;
		}

		.next-slide-cue {
			bottom: max(0.8rem, env(safe-area-inset-bottom));
			width: 2.35rem;
			height: 2.35rem;
		}
	}
</style>

<script lang="ts">
	import { onMount } from 'svelte';

	const posts = [
		{
			label: 'ARC Prize verification',
			href: 'https://x.com/raw_works/status/2037542109943628013',
			img: '/x-card-raw-works-arc-prize-symbolica-agent-verification-confusion.png',
			alt: 'Raymond Weitekamp on X questioning whether ARC Prize will verify the Symbolica agent despite its high score'
		},
		{
			label: 'LongCoT Open Harness',
			href: 'https://x.com/sumeetrm/status/2046014614987550941',
			img: '/x-card-sumeet-motwani-longcot-open-harness-gpt-5-2-rlm-sota.png',
			alt: 'Sumeet Motwani on X announcing LongCoT Open Harness and Restricted Harness leaderboards, with GPT 5.2 RLM SOTA on Open Harness'
		}
	];

	let root = $state<HTMLElement | null>(null);
	let track = $state<HTMLDivElement | null>(null);
	let active = $state(0);
	let mobile = $state(false);
	let inView = $state(false);
	let reduceMotion = $state(false);
	let paused = $state(false);

	let pauseTimer: ReturnType<typeof setTimeout> | null = null;
	let swipe:
		| {
				pointerId: number;
				startX: number;
				startY: number;
				lastX: number;
				lastY: number;
				isHorizontal: boolean;
		  }
		| null = null;
	let suppressClickUntil = 0;
	const autoRotateMs = 4_500;
	const resumeDelayMs = 12_000;
	const swipeThresholdPx = 48;
	const swipeAxisLockPx = 10;

	function syncActiveFromScroll() {
		if (!track) return;
		const panels = Array.from(track.querySelectorAll<HTMLElement>('[data-benchmark-panel]'));
		if (panels.length === 0) return;

		const trackRect = track.getBoundingClientRect();
		const trackCenter = trackRect.left + trackRect.width / 2;
		const nearest = panels
			.map((panel, index) => {
				const rect = panel.getBoundingClientRect();
				return { index, distance: Math.abs(rect.left + rect.width / 2 - trackCenter) };
			})
			.sort((a, b) => a.distance - b.distance)[0];

		if (nearest) active = nearest.index;
	}

	function show(index: number) {
		active = index;
		const panel = track?.querySelector<HTMLElement>(`[data-benchmark-panel="${index}"]`);
		panel?.scrollIntoView({
			behavior: reduceMotion ? 'auto' : 'smooth',
			block: 'nearest',
			inline: 'center'
		});
	}

	function pauseAfterInteraction() {
		paused = true;
		if (pauseTimer) clearTimeout(pauseTimer);
		pauseTimer = setTimeout(() => {
			paused = false;
			pauseTimer = null;
		}, resumeDelayMs);
	}

	function handlePointerDown(event: PointerEvent) {
		if (!mobile || event.pointerType === 'mouse') return;
		pauseAfterInteraction();
		swipe = {
			pointerId: event.pointerId,
			startX: event.clientX,
			startY: event.clientY,
			lastX: event.clientX,
			lastY: event.clientY,
			isHorizontal: false
		};
		(event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
	}

	function handlePointerMove(event: PointerEvent) {
		if (!swipe || event.pointerId !== swipe.pointerId) return;

		swipe.lastX = event.clientX;
		swipe.lastY = event.clientY;
		const dx = event.clientX - swipe.startX;
		const dy = event.clientY - swipe.startY;
		const horizontalIntent =
			Math.abs(dx) > swipeAxisLockPx && Math.abs(dx) > Math.abs(dy) * 1.2;

		if (horizontalIntent) {
			swipe.isHorizontal = true;
			event.preventDefault();
		}
	}

	function handlePointerEnd(event: PointerEvent) {
		if (!swipe || event.pointerId !== swipe.pointerId) return;
		(event.currentTarget as HTMLElement).releasePointerCapture?.(event.pointerId);

		const dx = swipe.lastX - swipe.startX;
		const dy = swipe.lastY - swipe.startY;
		const isSwipe =
			swipe.isHorizontal &&
			Math.abs(dx) >= swipeThresholdPx &&
			Math.abs(dx) > Math.abs(dy) * 1.2;
		swipe = null;

		if (!isSwipe) return;

		event.preventDefault();
		suppressClickUntil = performance.now() + 450;
		const direction = dx < 0 ? 1 : -1;
		show(Math.max(0, Math.min(posts.length - 1, active + direction)));
	}

	function handlePointerCancel(event: PointerEvent) {
		if (!swipe || event.pointerId !== swipe.pointerId) return;
		(event.currentTarget as HTMLElement).releasePointerCapture?.(event.pointerId);
		swipe = null;
	}

	function guardClickAfterSwipe(event: MouseEvent) {
		if (performance.now() <= suppressClickUntil) {
			event.preventDefault();
			event.stopPropagation();
		}
	}

	onMount(() => {
		const mobileQuery = window.matchMedia('(width <= 760px)');
		const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
		const updateQueries = () => {
			mobile = mobileQuery.matches;
			reduceMotion = reduceQuery.matches;
		};

		updateQueries();
		mobileQuery.addEventListener('change', updateQueries);
		reduceQuery.addEventListener('change', updateQueries);

		const observer = new IntersectionObserver(
			(entries) => {
				inView = entries.some((entry) => entry.isIntersecting);
			},
			{ threshold: 0.55 }
		);
		if (root) observer.observe(root);

		let frame = 0;
		const onScroll = () => {
			cancelAnimationFrame(frame);
			frame = requestAnimationFrame(syncActiveFromScroll);
		};
		track?.addEventListener('scroll', onScroll, { passive: true });

		return () => {
			mobileQuery.removeEventListener('change', updateQueries);
			reduceQuery.removeEventListener('change', updateQueries);
			observer.disconnect();
			track?.removeEventListener('scroll', onScroll);
			cancelAnimationFrame(frame);
			if (pauseTimer) clearTimeout(pauseTimer);
		};
	});

	$effect(() => {
		if (!mobile || !inView || reduceMotion || paused) return;

		const timer = setInterval(() => {
			show((active + 1) % posts.length);
		}, autoRotateMs);

		return () => clearInterval(timer);
	});
</script>

<section
	bind:this={root}
	class="benchmark-tweets"
	data-benchmark-tweets
	aria-label="Two X posts about agents, RLMs, and benchmark evaluation"
	aria-roledescription="carousel"
	onfocusin={pauseAfterInteraction}
>
	<div
		bind:this={track}
		class="benchmark-tweets__track"
		role="group"
		aria-label="Benchmark posts"
		onpointerdown={handlePointerDown}
		onpointermove={handlePointerMove}
		onpointerup={handlePointerEnd}
		onpointercancel={handlePointerCancel}
	>
		{#each posts as post, index}
			<article class="benchmark-tweets__panel" data-benchmark-panel={index}>
				<a
					class="benchmark-tweets__link"
					href={post.href}
					target="_blank"
					rel="noopener noreferrer"
					onclick={guardClickAfterSwipe}
				>
					<img class="benchmark-tweets__image" src={post.img} alt={post.alt} />
				</a>
			</article>
		{/each}
	</div>

	<div class="benchmark-tweets__dots" aria-label="Benchmark post selector">
		{#each posts as post, index}
			<button
				type="button"
				class="benchmark-tweets__dot"
				class:active={active === index}
				aria-label={`Show ${post.label}`}
				aria-current={active === index ? 'true' : undefined}
				onclick={() => {
					pauseAfterInteraction();
					show(index);
				}}
			>
				<span></span>
			</button>
		{/each}
	</div>
</section>

<style>
	.benchmark-tweets {
		width: 100%;
		margin-top: clamp(1.2rem, 3vw, 2rem);
	}

	.benchmark-tweets__track {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: clamp(1.4rem, 4vw, 3.2rem);
		align-items: center;
	}

	.benchmark-tweets__panel {
		display: grid;
		justify-items: center;
		min-width: 0;
	}

	.benchmark-tweets__link {
		display: block;
		text-decoration: none;
	}

	.benchmark-tweets__image {
		display: block;
		width: min(40vw, 500px);
		height: min(73dvh, 620px);
		max-width: 100%;
		object-fit: cover;
		object-position: top center;
		border: 1px solid color-mix(in oklch, var(--deck-text) 18%, transparent);
		border-radius: 8px;
		box-shadow: 0 28px 70px -38px color-mix(in oklch, var(--deck-text) 55%, transparent);
		transition:
			transform 0.16s ease,
			border-color 0.16s ease;
	}

	.benchmark-tweets__link:hover .benchmark-tweets__image {
		transform: translateY(-2px);
		border-color: color-mix(in oklch, var(--deck-accent) 45%, var(--deck-text));
	}

	.benchmark-tweets__link:focus-visible {
		outline: 2px solid var(--deck-accent);
		outline-offset: 4px;
		border-radius: 8px;
	}

	.benchmark-tweets__dots {
		display: none;
	}

	@media (min-width: 761px) and (max-height: 800px) {
		.benchmark-tweets {
			margin-top: 1rem;
		}

		.benchmark-tweets__image {
			height: min(67dvh, 520px);
		}
	}

	@media (width <= 760px) {
		.benchmark-tweets {
			margin-top: 0.72rem;
		}

		.benchmark-tweets__track {
			display: flex;
			gap: 0.85rem;
			overflow-x: auto;
			overscroll-behavior-x: contain;
			scroll-padding-inline: 0.35rem;
			scroll-snap-type: x mandatory;
			padding: 0.05rem 0.35rem 0.45rem;
			touch-action: pan-y;
			-webkit-overflow-scrolling: touch;
			scrollbar-width: none;
		}

		.benchmark-tweets__track::-webkit-scrollbar {
			display: none;
		}

		.benchmark-tweets__panel {
			flex: 0 0 min(100%, 22rem);
			width: min(100%, 22rem);
			scroll-snap-align: center;
			scroll-snap-stop: always;
		}

		.benchmark-tweets__link {
			display: grid;
			align-items: start;
			justify-items: center;
			width: 100%;
			height: min(62dvh, 500px);
			overflow: auto;
			overscroll-behavior: contain;
			touch-action: pan-y;
			border-radius: 8px;
			background: color-mix(in oklch, var(--deck-text) 4%, var(--deck-bg));
		}

		.benchmark-tweets__image {
			width: 100%;
			height: auto;
			max-width: none;
			max-height: none;
			object-fit: contain;
			box-shadow: none;
		}

		.benchmark-tweets__dots {
			display: flex;
			justify-content: center;
			gap: 0.35rem;
			margin-top: 0.42rem;
		}

		.benchmark-tweets__dot {
			display: grid;
			place-items: center;
			width: 1.4rem;
			height: 1.25rem;
			padding: 0;
			border: 0;
			border-radius: 999px;
			background: transparent;
			color: var(--deck-muted);
			cursor: pointer;
			-webkit-tap-highlight-color: transparent;
		}

		.benchmark-tweets__dot span {
			width: 0.48rem;
			height: 0.48rem;
			border-radius: 999px;
			background: currentColor;
			opacity: 0.38;
			transition:
				opacity 0.18s ease,
				transform 0.18s ease,
				background 0.18s ease;
		}

		.benchmark-tweets__dot.active {
			color: var(--deck-accent);
		}

		.benchmark-tweets__dot.active span {
			opacity: 1;
			transform: scale(1.35);
		}

		.benchmark-tweets__dot:focus-visible {
			outline: 2px solid var(--deck-accent);
			outline-offset: 2px;
		}
	}
</style>

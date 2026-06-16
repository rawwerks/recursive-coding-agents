<script lang="ts">
	// Demo of shadcn-svelte in the "website chrome" role: a fixed site nav that
	// sits outside the deck. Uses the copied-in Button component.
	import ArrowUpIcon from '@lucide/svelte/icons/arrow-up';
	import ExternalLinkIcon from '@lucide/svelte/icons/external-link';
	import { Button } from '$lib/components/ui/button';
</script>

<header class="site-nav">
	<span class="brand">deck<span class="accent">.</span>starter</span>
	<nav>
		<Button class="nav-button" href="#slide-1" variant="ghost" size="sm">
			<ArrowUpIcon data-icon="inline-start" aria-hidden="true" />
			Top
		</Button>
		<Button class="nav-button" href="https://github.com" variant="outline" size="sm">
			<ExternalLinkIcon data-icon="inline-start" aria-hidden="true" />
			GitHub
		</Button>
	</nav>
</header>

<style>
	.site-nav {
		position: fixed;
		top: clamp(0.8rem, 2.5vw, 1.4rem);
		left: clamp(1rem, 4vw, 2.4rem);
		right: clamp(1rem, 4vw, 2.4rem);
		z-index: 20;
		display: flex;
		align-items: center;
		justify-content: flex-start;
		gap: clamp(0.6rem, 2vw, 1.1rem);
		pointer-events: none;
	}

	.brand {
		font-weight: 700;
		letter-spacing: 0;
		color: var(--deck-text);
		white-space: nowrap;
	}

	.brand .accent {
		color: var(--deck-accent);
	}

	nav {
		display: flex;
		gap: 0.4rem;
		pointer-events: auto;
	}

	.site-nav :global(.nav-button) {
		backdrop-filter: blur(14px);
	}

	@media (max-width: 520px) {
		.site-nav {
			gap: 0.65rem;
		}

		.site-nav :global(.nav-button) {
			min-height: 44px;
			padding-inline: 0.8rem;
		}
	}

	@media (max-width: 380px) {
		.brand {
			max-width: 8rem;
			overflow: hidden;
			text-overflow: ellipsis;
		}
	}
</style>

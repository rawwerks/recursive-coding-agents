<script lang="ts">
	import ClockIcon from '@lucide/svelte/icons/clock';
	import ExternalLinkIcon from '@lucide/svelte/icons/external-link';
	import GitForkIcon from '@lucide/svelte/icons/git-fork';
	import LockKeyholeIcon from '@lucide/svelte/icons/lock-keyhole';
	import ScaleIcon from '@lucide/svelte/icons/scale';
	import StarIcon from '@lucide/svelte/icons/star';
	import SiGithub from '@icons-pack/svelte-simple-icons/icons/SiGithub';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';

	interface Language {
		name: string;
		color?: string;
	}

	interface Props {
		owner: string;
		name: string;
		description: string;
		href: string;
		visibility?: 'public' | 'private' | 'internal';
		language?: Language;
		stars?: string | number;
		forks?: string | number;
		license?: string;
		updated?: string;
		topics?: string[];
		showTopics?: boolean;
		homepage?: string;
		ctaLabel?: string;
	}

	let {
		owner,
		name,
		description,
		href,
		visibility = 'public',
		language,
		stars,
		forks,
		license,
		updated,
		topics = [],
		showTopics = false,
		homepage,
		ctaLabel = 'Open repo'
	}: Props = $props();

	const visibilityLabel = $derived(
		`${visibility[0].toUpperCase()}${visibility.slice(1)} repository`
	);
</script>

<Card.Root class="repo-preview" data-repo-preview data-visibility={visibility}>
	<Card.Header class="repo-header">
		{#if visibility !== 'public'}
			<div class="repo-kicker">
				<span class="repo-icon" aria-hidden="true">
					<LockKeyholeIcon />
				</span>
				<span>{visibilityLabel}</span>
			</div>
		{/if}

		<div class="repo-heading">
			<span class="github-mark" aria-hidden="true">
				<SiGithub title="" size={22} />
			</span>
			<Card.Title class="repo-title">
				<span class="repo-owner">{owner}</span><span class="repo-separator">/</span><span>{name}</span>
			</Card.Title>
		</div>
		<Card.Description class="repo-description">{description}</Card.Description>
	</Card.Header>

	<Card.Content class="repo-content">
		<div class="repo-meta" aria-label="Repository metadata">
			{#if language}
				<span class="repo-meta-item language" style={`--language-color:${language.color ?? 'var(--primary)'}`}>
					<span class="language-dot" aria-hidden="true"></span>
					{language.name}
				</span>
			{/if}
			{#if stars !== undefined}
				<span class="repo-meta-item">
					<StarIcon aria-hidden="true" />
					{stars}
				</span>
			{/if}
			{#if forks !== undefined}
				<span class="repo-meta-item">
					<GitForkIcon aria-hidden="true" />
					{forks}
				</span>
			{/if}
			{#if license}
				<span class="repo-meta-item">
					<ScaleIcon aria-hidden="true" />
					{license}
				</span>
			{/if}
			{#if updated}
				<span class="repo-meta-item">
					<ClockIcon aria-hidden="true" />
					{updated}
				</span>
			{/if}
		</div>

		{#if showTopics && topics.length > 0}
			<ul class="repo-topics" aria-label="Repository topics">
				{#each topics.slice(0, 5) as topic}
					<li>{topic}</li>
				{/each}
			</ul>
		{/if}
	</Card.Content>

	<Card.Footer class="repo-actions">
		<Button href={href} size="sm">
			<SiGithub data-icon="inline-start" title="" size={16} aria-hidden="true" />
			{ctaLabel}
		</Button>
		{#if homepage}
			<Button href={homepage} variant="outline" size="sm">
				<ExternalLinkIcon data-icon="inline-start" aria-hidden="true" />
				Homepage
			</Button>
		{/if}
	</Card.Footer>
</Card.Root>

<style>
	:global(.repo-preview) {
		position: relative;
		isolation: isolate;
		width: 100%;
		border-radius: var(--radius-lg);
		background:
			linear-gradient(
				135deg,
				color-mix(in oklch, var(--primary) 13%, transparent),
				transparent 42%
			),
			var(--card);
		box-shadow: 0 24px 80px -56px color-mix(in srgb, var(--foreground) 55%, transparent);
	}

	:global(.repo-preview)::before {
		content: '';
		position: absolute;
		inset: 0;
		z-index: -1;
		border-radius: inherit;
		border: 1px solid color-mix(in oklch, var(--primary) 28%, var(--border));
		pointer-events: none;
	}

	:global(.repo-header),
	:global(.repo-content),
	:global(.repo-actions) {
		position: relative;
	}

	.repo-kicker {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		width: fit-content;
		margin-bottom: 0.8rem;
		color: var(--muted-foreground);
		font-size: 0.78rem;
		font-weight: 650;
		letter-spacing: 0;
	}

	.repo-icon {
		display: grid;
		place-items: center;
		width: 1.8rem;
		height: 1.8rem;
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		background: color-mix(in oklch, var(--background) 72%, transparent);
		color: var(--primary);
	}

	.repo-icon :global(svg),
	.repo-meta-item :global(svg),
	.github-mark :global(svg) {
		width: 1rem;
		height: 1rem;
	}

	.repo-heading {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		min-width: 0;
	}

	.github-mark {
		display: grid;
		place-items: center;
		flex: 0 0 auto;
		width: 2.1rem;
		height: 2.1rem;
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		background: color-mix(in oklch, var(--background) 74%, transparent);
		color: var(--foreground);
	}

	:global(.repo-title) {
		display: flex;
		flex-wrap: wrap;
		gap: 0.1rem;
		align-items: baseline;
		color: var(--foreground);
		font-size: clamp(1.35rem, 3vw, 2rem);
		font-weight: 760;
		line-height: 1.08;
		letter-spacing: 0;
	}

	.repo-owner,
	.repo-separator {
		color: var(--muted-foreground);
		font-weight: 620;
	}

	:global(.repo-description) {
		max-width: 58ch;
		margin-top: 0.75rem;
		font-size: clamp(0.95rem, 1.8vw, 1.06rem);
		line-height: 1.55;
	}

	.repo-meta {
		display: flex;
		flex-wrap: wrap;
		gap: 0.55rem 0.75rem;
	}

	.repo-meta-item {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		min-height: 1.65rem;
		color: var(--muted-foreground);
		font-size: 0.86rem;
		font-variant-numeric: tabular-nums;
	}

	.repo-meta-item :global(svg) {
		color: color-mix(in oklch, var(--foreground) 72%, var(--muted-foreground));
	}

	.language-dot {
		width: 0.7rem;
		height: 0.7rem;
		border-radius: 999px;
		background: var(--language-color);
		box-shadow: 0 0 0 3px color-mix(in oklch, var(--language-color) 18%, transparent);
	}

	.repo-topics {
		display: flex;
		flex-wrap: wrap;
		gap: 0.45rem;
		margin: 1rem 0 0;
		padding: 0;
		list-style: none;
	}

	.repo-topics li {
		display: inline-flex;
		align-items: center;
		min-height: 1.75rem;
		padding: 0 0.65rem;
		border: 1px solid color-mix(in oklch, var(--primary) 28%, var(--border));
		border-radius: 999px;
		background: color-mix(in oklch, var(--primary) 8%, transparent);
		color: color-mix(in oklch, var(--primary) 72%, var(--foreground));
		font-size: 0.78rem;
		font-weight: 620;
	}

	:global(.repo-actions) {
		flex-wrap: wrap;
		gap: 0.55rem;
		padding-top: 0.2rem;
	}

	:global(.repo-actions) :global([data-slot='button']) {
		min-height: 2.5rem;
	}

	@media (max-width: 520px) {
		:global(.repo-preview) {
			border-radius: var(--radius-md);
		}

		:global(.repo-title) {
			font-size: 1.35rem;
		}

		:global(.repo-actions) :global([data-slot='button']) {
			width: 100%;
			min-height: 2.75rem;
		}
	}
</style>

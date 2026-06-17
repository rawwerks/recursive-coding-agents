<script lang="ts">
	import FileSearchIcon from '@lucide/svelte/icons/file-search';
	import GitBranchPlusIcon from '@lucide/svelte/icons/git-branch-plus';
	import HistoryIcon from '@lucide/svelte/icons/history';
	import ShieldCheckIcon from '@lucide/svelte/icons/shield-check';

	interface AppliedExample {
		title: string;
		source: string;
		href: string;
		accent: string;
		icon: typeof GitBranchPlusIcon;
		body: string;
	}

	const examples: AppliedExample[] = [
		{
			title: 'Repo-scale migrations',
			source: 'Claude dynamic workflows',
			href: 'https://claude.com/blog/a-harness-for-every-task-dynamic-workflows-in-claude-code',
			accent: '#e06f2f',
			icon: GitBranchPlusIcon,
			body: 'Split a large refactor into modules, callsites, or failing tests; workers patch isolated worktrees, then reviewer agents check the merge.'
		},
		{
			title: 'Repo-handle investigation',
			source: 'OpenProse',
			href: 'https://github.com/rawwerks/recursive-coding-agents/blob/main/openprose/rlm/directory-handle-slicer.prose.md',
			accent: '#3178c6',
			icon: FileSearchIcon,
			body: 'Start from a directory handle; the decomposer chooses file handles, workers inspect one file each, and aggregation cites their evidence.'
		},
		{
			title: 'Audits and bug sweeps',
			source: 'Claude dynamic workflows',
			href: 'https://code.claude.com/docs/en/workflows',
			accent: '#24a148',
			icon: ShieldCheckIcon,
			body: 'Parallel agents audit routes, auth, data access, and risky patterns; skeptic agents challenge findings before anything reaches the report.'
		},
		{
			title: 'Golden sessions into programs',
			source: 'OpenProse',
			href: 'https://www.turingpost.com/p/openprose-a-language-for-reliable-agents',
			accent: '#8b5cf6',
			icon: HistoryIcon,
			body: 'Mine high-quality Claude, Codex, or Pi sessions into versioned .prose.md workflows with phases, gates, loops, and validation evidence.'
		}
	];
</script>

<ul class="applied-list" aria-label="Applied recursive coding-agent examples">
	{#each examples as example (example.href)}
		<li>
			<a
				class="applied-example"
				href={example.href}
				target="_blank"
				rel="noopener noreferrer"
				style={`--example-accent:${example.accent}`}
			>
				<span class="example-icon" aria-hidden="true">
					<svelte:component this={example.icon} />
				</span>
				<span class="example-copy">
					<span class="example-row">
						<strong>{example.title}</strong>
						<span class="example-source">{example.source}</span>
					</span>
					<span class="example-body">{example.body}</span>
				</span>
			</a>
		</li>
	{/each}
</ul>

<style>
	.applied-list {
		display: block;
		margin: clamp(0.85rem, 2vw, 1.35rem) 0 0;
		padding: 0;
		list-style: none;
	}

	.applied-list li {
		display: block;
		margin: 0;
	}

	.applied-list li + li {
		border-top: 1px solid color-mix(in oklch, var(--deck-text) 14%, transparent);
	}

	.applied-example {
		display: grid;
		grid-template-columns: clamp(2.2rem, 4vw, 2.9rem) minmax(0, 1fr);
		gap: clamp(0.72rem, 1.5vw, 1rem);
		align-items: center;
		padding: clamp(0.58rem, 1.25vw, 0.86rem) 0;
		color: var(--deck-text);
		text-decoration: none;
		transition:
			padding-left 0.18s cubic-bezier(0.2, 0.7, 0.2, 1),
			color 0.16s ease;
	}

	.applied-example:hover,
	.applied-example:focus-visible {
		padding-left: clamp(0.35rem, 0.9vw, 0.65rem);
		outline: none;
	}

	.applied-example:focus-visible {
		outline: 2px solid var(--deck-accent);
		outline-offset: 4px;
		border-radius: 5px;
	}

	.example-icon {
		display: grid;
		place-items: center;
		width: clamp(2.2rem, 4vw, 2.9rem);
		height: clamp(2.2rem, 4vw, 2.9rem);
		border: 1px solid color-mix(in oklch, var(--example-accent) 45%, var(--deck-text) 16%);
		border-radius: 8px;
		background: color-mix(in oklch, var(--example-accent) 13%, transparent);
		color: color-mix(in oklch, var(--example-accent) 78%, var(--deck-text));
	}

	.example-icon :global(svg) {
		width: clamp(1.12rem, 2.2vw, 1.42rem);
		height: clamp(1.12rem, 2.2vw, 1.42rem);
		stroke-width: 2.1;
	}

	.example-copy {
		display: grid;
		gap: 0.28rem;
		min-width: 0;
	}

	.example-row {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.35rem 1rem;
	}

	.example-row strong {
		color: var(--deck-text);
		font-size: clamp(1.04rem, 1.55vw, 1.34rem);
		font-weight: 740;
		line-height: 1.1;
		letter-spacing: 0;
	}

	.example-source {
		flex: 0 0 auto;
		color: var(--deck-muted);
		font-size: clamp(0.8rem, 1vw, 0.92rem);
		font-weight: 650;
		line-height: 1.1;
	}

	.example-body {
		max-width: 94ch;
		color: var(--deck-muted);
		font-size: clamp(0.98rem, 1.28vw, 1.18rem);
		line-height: 1.34;
		text-wrap: pretty;
	}

	@media (max-width: 700px) {
		.applied-example {
			grid-template-columns: clamp(2rem, 10vw, 2.4rem) minmax(0, 1fr);
			align-items: start;
		}

		.example-icon {
			margin-top: 0.12rem;
			width: clamp(2rem, 10vw, 2.4rem);
			height: clamp(2rem, 10vw, 2.4rem);
		}

		.example-source {
			flex-basis: 100%;
		}
	}

	@media (max-width: 380px) and (max-height: 760px) {
		.applied-list {
			margin-top: 0.48rem;
		}

		.applied-example {
			grid-template-columns: 1.72rem minmax(0, 1fr);
			gap: 0.52rem;
			padding: 0.38rem 0;
		}

		.example-icon {
			width: 1.72rem;
			height: 1.72rem;
			border-radius: 6px;
		}

		.example-icon :global(svg) {
			width: 0.92rem;
			height: 0.92rem;
		}

		.example-copy {
			gap: 0.16rem;
		}

		.example-row strong {
			font-size: 0.84rem;
			line-height: 1.06;
		}

		.example-source {
			font-size: 0.58rem;
		}

		.example-body {
			display: -webkit-box;
			overflow: hidden;
			font-size: 0.72rem;
			line-height: 1.18;
			line-clamp: 2;
			-webkit-box-orient: vertical;
			-webkit-line-clamp: 2;
		}
	}

	@media (min-width: 761px) and (max-height: 900px) {
		.applied-list {
			margin-top: 0.58rem;
		}

		.applied-example {
			grid-template-columns: 1.9rem minmax(0, 1fr);
			gap: 0.58rem;
			padding: 0.38rem 0;
		}

		.example-icon {
			width: 1.9rem;
			height: 1.9rem;
			border-radius: 6px;
		}

		.example-icon :global(svg) {
			width: 0.98rem;
			height: 0.98rem;
		}

		.example-copy {
			gap: 0.14rem;
		}

		.example-row strong {
			font-size: 0.86rem;
			line-height: 1.06;
		}

		.example-source {
			font-size: 0.58rem;
		}

		.example-body {
			font-size: 0.74rem;
			line-height: 1.18;
		}
	}
</style>

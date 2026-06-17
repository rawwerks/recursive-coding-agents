<script lang="ts">
	import * as Table from '$lib/components/ui/table';
	import Check from '@lucide/svelte/icons/check';
	import X from '@lucide/svelte/icons/x';

	const COLS = [
		{ crit: 'Executable environment', short: 'Exec' },
		{ crit: 'Prompt externalized', short: 'Prompt' },
		{ crit: 'Code calls the model', short: 'Call' },
		{ crit: 'Model picks decomposition', short: 'Pick' },
		{ crit: 'State stays symbolic', short: 'State' }
	];

	const ROWS = [
		{ sys: 'Plain long-context call', tag: 'RAG / reasoning-only', marks: [0, 0, 0, 0, 0], rlm: false },
		{ sys: 'Coding agents + subagents', tag: 'including loops', marks: [1, 1, 0, 1, 1], rlm: false },
		{ sys: 'Hardcoded map-reduce', tag: 'developer-authored pipeline — e.g. λ-RLM', marks: [1, 1, 1, 0, 1], rlm: false },
		{ sys: 'Recursive Language Model', tag: 'passes every check', marks: [1, 1, 1, 1, 1], rlm: true }
	];
</script>

<div class="rlm-check-grid mx-auto w-full text-left" data-rlm-check-grid>
	<div class="rlm-check-table">
		<Table.Root class="table-fixed">
		<colgroup>
			<col class="rlm-check-system-col" />
			{#each COLS as col}
				<col class="rlm-check-mark-col" />
			{/each}
		</colgroup>
		<Table.Header>
			<Table.Row class="border-border hover:bg-transparent">
				<Table.Head class="whitespace-normal"></Table.Head>
				{#each COLS as col}
					<Table.Head class="whitespace-normal px-2 text-center align-bottom">
						<span class="block text-[1rem] font-semibold leading-tight text-foreground">{col.crit}</span>
					</Table.Head>
				{/each}
			</Table.Row>
		</Table.Header>
		<Table.Body>
			{#each ROWS as row}
				<Table.Row
					class={row.rlm
						? 'border-y-2 border-primary/50 bg-primary/10 hover:bg-primary/10'
						: 'border-border'}
				>
					<Table.Cell class="whitespace-normal py-[1.05rem]">
						<span
							class={'block text-[1.18rem] font-semibold leading-tight ' +
								(row.rlm ? 'text-primary' : 'text-foreground')}>{row.sys}</span
						>
						<span class="mt-1 block text-[0.88rem] leading-snug text-muted-foreground">{row.tag}</span>
					</Table.Cell>
					{#each row.marks as m}
						<Table.Cell class="text-center">
							{#if m}
								<Check class={'mx-auto size-6 ' + (row.rlm ? 'text-primary' : 'text-emerald-400')} />
							{:else}
								<X class="mx-auto size-6 text-muted-foreground/30" />
							{/if}
						</Table.Cell>
					{/each}
				</Table.Row>
			{/each}
		</Table.Body>
		</Table.Root>
	</div>

	<div class="rlm-check-cards" aria-label="RLM rubric checks">
		<div class="rlm-check-legend" aria-hidden="true">
			<span></span>
			{#each COLS as col}
				<span>{col.short}</span>
			{/each}
		</div>
		{#each ROWS as row}
			<article class={row.rlm ? 'rlm-row-card rlm-row-card--pass' : 'rlm-row-card'}>
				<div class="rlm-row-card__header">
					<strong>{row.sys}</strong>
					<span>{row.tag}</span>
				</div>
				<ul>
					{#each row.marks as mark, i}
						<li class:present={mark === 1} aria-label={`${COLS[i].crit}: ${mark ? 'yes' : 'no'}`}>
							{#if mark}
								<Check aria-hidden="true" />
							{:else}
								<X aria-hidden="true" />
							{/if}
						</li>
					{/each}
				</ul>
			</article>
		{/each}
	</div>

	<a
		class="rlm-rubric-link"
		href="https://github.com/rawwerks/recursive-coding-agents/blob/main/rlm-rubric/README.md"
		target="_blank"
		rel="noopener noreferrer"
	>
		Open the RLM rubric
	</a>
</div>

<style>
	.rlm-rubric-link {
		display: block;
		width: fit-content;
		margin: clamp(0.7rem, 1.8dvh, 1.05rem) auto 0;
		font-size: clamp(0.8rem, 0.74rem + 0.22vw, 0.95rem);
		font-weight: 700;
		line-height: 1.2;
		color: var(--deck-accent);
		text-align: center;
		text-decoration: none;
	}

	.rlm-rubric-link:hover {
		text-decoration: underline;
		text-underline-offset: 0.22em;
	}

	.rlm-rubric-link:focus-visible {
		outline: 2px solid var(--deck-accent);
		outline-offset: 4px;
		border-radius: 4px;
	}

	.rlm-check-cards {
		display: none;
	}

	.rlm-check-system-col {
		width: 30%;
	}

	.rlm-check-mark-col {
		width: 14%;
	}

	.rlm-check-table :global([data-slot='table']) {
		table-layout: fixed;
	}

	.rlm-check-table :global([data-slot='table-head'] span) {
		overflow-wrap: anywhere;
		text-wrap: balance;
	}

	@media (max-width: 760px) {
		.rlm-check-table {
			display: none;
		}

		.rlm-check-cards {
			display: grid;
			gap: 0.34rem;
		}

		.rlm-check-legend,
		.rlm-row-card {
			display: grid;
			gap: 0.42rem;
		}

		.rlm-check-legend {
			grid-template-columns: repeat(5, minmax(0, 1fr));
			padding: 0 0.78rem;
		}

		.rlm-check-legend span:first-child {
			display: none;
		}

		.rlm-row-card {
			grid-template-columns: minmax(0, 1fr);
			align-items: start;
		}

		.rlm-check-legend {
			color: var(--deck-muted);
			font-size: 0.62rem;
			font-weight: 700;
			line-height: 1;
			text-align: center;
			text-transform: uppercase;
		}

		.rlm-check-legend span {
			overflow-wrap: anywhere;
		}

		.rlm-row-card {
			padding: 0.62rem 0.78rem;
			border: 1px solid color-mix(in oklch, var(--deck-text) 16%, transparent);
			border-radius: 8px;
			background: color-mix(in oklch, var(--deck-text) 4%, var(--deck-bg));
		}

		.rlm-row-card--pass {
			border-color: color-mix(in oklch, var(--deck-accent) 45%, transparent);
			background: color-mix(in oklch, var(--deck-accent) 10%, var(--deck-bg));
		}

		.rlm-row-card__header {
			display: grid;
			gap: 0.1rem;
			min-width: 0;
		}

		.rlm-row-card__header strong {
			font-size: 0.94rem;
			line-height: 1.12;
			color: var(--deck-text);
			overflow-wrap: anywhere;
		}

		.rlm-row-card--pass .rlm-row-card__header strong {
			color: var(--deck-accent);
		}

		.rlm-row-card__header span {
			display: none;
		}

		.rlm-row-card ul {
			display: grid;
			grid-template-columns: repeat(5, minmax(0, 1fr));
			gap: 0.34rem;
			width: 100%;
			margin: 0;
			padding: 0;
			list-style: none;
		}

		.rlm-row-card li {
			display: grid;
			place-items: center;
			min-width: 0;
			color: var(--deck-muted);
		}

		.rlm-row-card li.present {
			color: var(--deck-accent);
		}

		.rlm-row-card li :global(svg) {
			width: 0.98rem;
			height: 0.98rem;
			color: currentColor;
		}

		.rlm-rubric-link {
			margin-top: 0.55rem;
			font-size: 0.74rem;
		}
	}

	@media (min-width: 761px) and (max-height: 900px) {
		.rlm-check-table :global([data-slot='table-head']) {
			height: 2.85rem;
			padding-inline: 0.52rem;
		}

		.rlm-check-table :global([data-slot='table-cell']) {
			padding: 0.82rem 0.52rem;
		}

		.rlm-check-table :global([data-slot='table-head'] span) {
			font-size: 0.93rem;
		}

		.rlm-check-table :global([data-slot='table-cell'] span:first-child) {
			font-size: 1.1rem;
			line-height: 1.12;
		}

		.rlm-check-table :global([data-slot='table-cell'] span:last-child) {
			font-size: 0.82rem;
			line-height: 1.2;
		}

		.rlm-check-table :global(svg) {
			width: 1.35rem;
			height: 1.35rem;
		}
	}
</style>

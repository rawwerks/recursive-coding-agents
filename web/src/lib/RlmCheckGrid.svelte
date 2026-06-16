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
		{ sys: 'Subagents', tag: 'verbal delegation', marks: [0, 0, 0, 1, 0], rlm: false },
		{ sys: 'Coding agent + bash', tag: 'CodeAct-style, one session', marks: [1, 0, 0, 1, 0], rlm: false },
		{ sys: 'Agentic loops', tag: "Ralph + the 2026 'loop engineering' wave", marks: [1, 0, 0, 0, 1], rlm: false },
		{ sys: 'Hardcoded map-reduce', tag: 'developer-authored pipeline — e.g. λ-RLM', marks: [1, 1, 1, 0, 1], rlm: false },
		{ sys: 'Recursive Language Model', tag: 'passes every check', marks: [1, 1, 1, 1, 1], rlm: true }
	];
</script>

<div class="rlm-check-grid mx-auto w-full text-left" data-rlm-check-grid>
	<div class="rlm-check-table">
		<Table.Root>
		<Table.Header>
			<Table.Row class="border-border hover:bg-transparent">
				<Table.Head class="w-[28%]"></Table.Head>
				{#each COLS as col}
					<Table.Head class="px-2 text-center align-bottom">
						<span class="block text-[0.78rem] font-semibold leading-tight text-foreground">{col.crit}</span>
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
					<Table.Cell class="py-4">
						<span
							class={'block text-[0.95rem] font-semibold ' +
								(row.rlm ? 'text-primary' : 'text-foreground')}>{row.sys}</span
						>
						<span class="mt-0.5 block text-xs text-muted-foreground">{row.tag}</span>
					</Table.Cell>
					{#each row.marks as m}
						<Table.Cell class="text-center">
							{#if m}
								<Check class={'mx-auto size-5 ' + (row.rlm ? 'text-primary' : 'text-emerald-400')} />
							{:else}
								<X class="mx-auto size-5 text-muted-foreground/30" />
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
</div>

<style>
	.rlm-check-cards {
		display: none;
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
			grid-template-columns: minmax(0, 1fr) repeat(5, 2.36rem);
			gap: 0.34rem;
			align-items: center;
		}

		.rlm-check-legend {
			padding: 0 0.62rem;
			color: var(--deck-muted);
			font-size: 0.55rem;
			font-weight: 700;
			line-height: 1;
			text-align: center;
			text-transform: uppercase;
		}

		.rlm-row-card {
			padding: 0.48rem 0.62rem;
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
			font-size: 0.78rem;
			line-height: 1.12;
			color: var(--deck-text);
		}

		.rlm-row-card--pass .rlm-row-card__header strong {
			color: var(--deck-accent);
		}

		.rlm-row-card__header span {
			display: none;
		}

		.rlm-row-card ul {
			grid-column: 2 / -1;
			display: grid;
			grid-template-columns: subgrid;
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
			width: 0.82rem;
			height: 0.82rem;
			color: currentColor;
		}
	}

	@media (min-width: 761px) and (max-height: 900px) {
		.rlm-check-table :global([data-slot='table-head']) {
			height: 2.2rem;
			padding-inline: 0.35rem;
		}

		.rlm-check-table :global([data-slot='table-cell']) {
			padding: 0.52rem 0.35rem;
		}

		.rlm-check-table :global([data-slot='table-head'] span) {
			font-size: 0.64rem;
		}

		.rlm-check-table :global([data-slot='table-cell'] span:first-child) {
			font-size: 0.8rem;
			line-height: 1.08;
		}

		.rlm-check-table :global([data-slot='table-cell'] span:last-child) {
			font-size: 0.64rem;
			line-height: 1.12;
		}

		.rlm-check-table :global(svg) {
			width: 1rem;
			height: 1rem;
		}
	}
</style>

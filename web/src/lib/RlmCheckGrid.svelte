<script lang="ts">
	import * as Table from '$lib/components/ui/table';
	import Check from '@lucide/svelte/icons/check';
	import X from '@lucide/svelte/icons/x';

	const COLS = [
		{ crit: 'Executable environment', gate: 'G4' },
		{ crit: 'Prompt externalized', gate: 'G2·G3' },
		{ crit: 'Code calls the model', gate: 'G5' },
		{ crit: 'Model picks decomposition', gate: 'G6' },
		{ crit: 'State stays symbolic', gate: 'G7' }
	];

	const ROWS = [
		{ sys: 'Plain long-context call', tag: 'RAG / reasoning-only', marks: [0, 0, 0, 0, 0], rlm: false },
		{ sys: 'Subagents', tag: 'verbal delegation', marks: [0, 0, 0, 1, 0], rlm: false },
		{ sys: 'Coding agent + bash', tag: 'CodeAct-style, one session', marks: [1, 0, 0, 1, 0], rlm: false },
		{ sys: 'Agentic loops', tag: "Ralph + the 2026 'loop engineering' wave", marks: [1, 0, 0, 0, 1], rlm: false },
		{ sys: 'Hardcoded map-reduce', tag: 'developer-authored pipeline', marks: [1, 1, 1, 0, 1], rlm: false },
		{ sys: 'Recursive Language Model', tag: 'passes every gate', marks: [1, 1, 1, 1, 1], rlm: true }
	];
</script>

<div class="mx-auto w-full text-left">
	<Table.Root>
		<Table.Header>
			<Table.Row class="border-border hover:bg-transparent">
				<Table.Head class="w-[28%]"></Table.Head>
				{#each COLS as col}
					<Table.Head class="px-2 text-center align-bottom">
						<span class="block text-[0.78rem] font-semibold leading-tight text-foreground">{col.crit}</span>
						<span
							class="mt-1.5 inline-block rounded-full border border-border px-2 py-0.5 text-[0.62rem] font-bold tracking-wide text-muted-foreground"
							>{col.gate}</span
						>
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

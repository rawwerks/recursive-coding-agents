<script lang="ts">
	// Reusable two-column "then vs now" verdict template: each side shows a timeframe,
	// a No/Yes call, and a tweet card. Layout is styled by the global .verdict-compare
	// rules in src/routes/+page.svelte. Pass `columns` (1-2 entries) as content.
	interface Column {
		when: string;
		call: string;
		kind: 'no' | 'yes';
		img: string;
		href: string;
		alt: string;
	}

	let { columns }: { columns: Column[] } = $props();
</script>

<div class="verdict-compare">
	{#each columns as c (c.kind + c.href)}
		<div class="verdict">
			<p class="verdict-call verdict-call--{c.kind}">{c.call}</p>
			<a class="verdict-tweet" href={c.href} target="_blank" rel="noopener noreferrer">
				<img src={c.img} alt={c.alt} />
			</a>
			<p class="verdict-when">{c.when}</p>
		</div>
	{/each}
</div>

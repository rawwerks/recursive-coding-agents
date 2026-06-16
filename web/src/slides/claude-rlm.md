---
label: Is Claude Code a RLM?
variant: split
eyebrow: Claude Code
---

<script>
	import VerdictCompare from '$lib/VerdictCompare.svelte';

	const columns = [
		{
			when: 'Q4 2025',
			call: 'No',
			kind: 'no',
			img: '/tweet-claude-subagents-no.png',
			href: 'https://x.com/garybasin/status/1978608030787784780',
			alt: 'alex zhang announcing Recursive Language Models on X, with Gary Basin replying below: "This is effectively Claude code sub-agents right?"'
		},
		{
			when: 'Q2 2026',
			call: 'Yes',
			kind: 'yes',
			img: '/tweet-claude-rlm-yes.png',
			href: 'https://x.com/lateinteraction/status/2060078643133763839',
			alt: 'Omar Khattab on X: "Claude Code is finally an RLM (oct 2025), congrats to Anthropic", quoting the Claude Code dynamic workflows announcement'
		}
	];
</script>

## Is Claude Code an RLM?

<VerdictCompare {columns} />

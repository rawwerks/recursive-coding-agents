---
label: OpenProse
variant: split
alt: true
eyebrow: For (almost) any coding agent
---

<script>
	import GitHubRepoPreview from '$lib/GitHubRepoPreview.svelte';
</script>

<div class="evidence-split">
	<div>

## A language compiled by the agent, not the computer.

A markdown spec plus a giant prompt, in logical English. No new syntax to learn.

The key: a **declarative contract** the agent must satisfy to be "done." That's the answer to slide 2 — trust.

Any agent with a filesystem and subagents can run it — and behave like an RLM.

See ["Stop Babysitting Agents, Start Authoring Outcomes" on Turing Post](https://www.turingpost.com/p/openprose-a-language-for-reliable-agents).

	</div>

	<GitHubRepoPreview
		owner="openprose"
		name="prose"
		description="A new kind of language for a new kind of computer."
		href="https://github.com/openprose/prose"
		homepage="https://openprose.ai"
		language={{ name: 'TypeScript', color: '#3178c6' }}
		stars="1.5k"
		forks={121}
		license="MIT"
		updated="Updated Jun 16, 2026"
	/>
</div>

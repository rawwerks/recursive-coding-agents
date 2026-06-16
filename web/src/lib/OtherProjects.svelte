<script lang="ts">
	import SiGithub from '@icons-pack/svelte-simple-icons/icons/SiGithub';

	// The RLM ecosystem reading list. Content lives here; layout is styled by the
	// global .project-list rules in src/routes/+page.svelte.
	interface Project {
		owner: string;
		name: string;
		href: string;
		lang: string;
		color: string;
		lead?: string; // optional bold prefix on the description
		desc: string;
	}

	const projects: Project[] = [
		{
			owner: 'alexzhang13',
			name: 'rlm',
			href: 'https://github.com/alexzhang13/rlm',
			lang: 'Python',
			color: '#3572a5',
			desc: 'The reference implementation from Alex Zhang and the RLM paper authors — the cleanest place to read the core recursion loop.'
		},
		{
			owner: 'stanfordnlp',
			name: 'dspy',
			href: 'https://github.com/stanfordnlp/dspy',
			lang: 'Python',
			color: '#3572a5',
			lead: 'dspy.RLM',
			desc: ' exposes RLM as a composable module inside larger DSPy programs — what I use for most of my own experiments.'
		},
		{
			owner: 'ax-llm',
			name: 'ax',
			href: 'https://github.com/ax-llm/ax',
			lang: 'TypeScript',
			color: '#3178c6',
			desc: 'A TypeScript, DSPy-style framework with first-class RLM support: AxAgent recursive decomposition and a persistent JS runtime.'
		},
		{
			owner: 'openprose',
			name: 'unix-rlm',
			href: 'https://github.com/openprose/unix-rlm',
			lang: 'Shell',
			color: '#89e051',
			desc: 'An RLM whose sandbox is a full Linux filesystem — one bash script, the whole computer as the environment.'
		},
		{
			owner: 'openprose',
			name: 'prose',
			href: 'https://github.com/openprose/prose',
			lang: 'TypeScript',
			color: '#3178c6',
			desc: 'A declarative markdown language the agent compiles into reliable, RLM-style execution.'
		}
	];
</script>

<ul class="project-list">
	{#each projects as p (p.href)}
		<li>
			<a class="project" href={p.href} target="_blank" rel="noopener noreferrer">
				<span class="project-row">
					<span class="project-id">
						<span class="project-mark" aria-hidden="true"><SiGithub title="" size={20} /></span>
						<span class="project-name"
							><span class="project-owner">{p.owner}</span><span class="project-slash">/</span>{p.name}</span
						>
					</span>
					<span class="project-lang"
						><span class="lang-dot" style={`--lang:${p.color}`} aria-hidden="true"></span>{p.lang}</span
					>
				</span>
				<span class="project-desc">{#if p.lead}<strong>{p.lead}</strong>{/if}{p.desc}</span>
			</a>
		</li>
	{/each}
</ul>

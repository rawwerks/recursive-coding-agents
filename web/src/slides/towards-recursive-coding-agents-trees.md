---
label: RLMs and Agents Recurse
variant: quote
eyebrow: Towards Recursive Coding Agents
---

<div class="bridge-tree-comparison" aria-label="RLM and agent recursion compared">
	<section class="bridge-tree-panel" aria-labelledby="rlm-tree-title">
		<h2 id="rlm-tree-title">RLM / LLM</h2>
		<pre class="rlm-tree-example">Root RLM (depth=0)
├── Sub-RLM A (depth=1)
│   ├── LLM A1 (depth=2)
│   └── LLM A2 (depth=2)
└── Sub-RLM B (depth=1)
    ├── LLM B1 (depth=2)
    └── LLM B2 (depth=2)</pre>
	</section>
	<section class="bridge-tree-panel" aria-labelledby="agent-tree-title">
		<h2 id="agent-tree-title">Agent / Sub-Agent</h2>
		<pre class="rlm-tree-example">Root Agent (depth=0)
├── Sub-Agent A (depth=1)
│   ├── Sub-Agent A1 (depth=2)
│   └── Sub-Agent A2 (depth=2)
└── Sub-Agent B (depth=1)
    ├── Sub-Agent B1 (depth=2)
    └── Sub-Agent B2 (depth=2)</pre>
	</section>
</div>

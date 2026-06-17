---
label: What changed — dynamic workflows
alt: true
---

<div class="workflow-showcase">
<div class="workflow-copy">

## Dynamic workflows made Claude Code recursive.

Claude can write an [orchestration script](https://claude.com/blog/a-harness-for-every-task-dynamic-workflows-in-claude-code), then run a fleet of subagents. The line is whether the **model chooses the decomposition**, or the script fixes it ahead of time.

</div>

<a class="workflow-article" href="https://claude.com/blog/a-harness-for-every-task-dynamic-workflows-in-claude-code" target="_blank" rel="noopener noreferrer">
	<img src="/claude-code-harness-for-every-task-dynamic-workflows.png" alt="Claude Code blog diagram: Six workflow patterns" />
	<span>Claude Code blog · harness for every task</span>
</a>

<div class="workflow-example-links">
	<a class="url-preview" href="https://github.com/rawwerks/recursive-coding-agents/tree/main/claude-dynamic-workflows/rlm" target="_blank" rel="noopener noreferrer">
		<span class="preview-caption">
			<span class="preview-source">RLM example · model-chosen split</span>
			<strong>file-handle-clean.workflow.js</strong>
			<span class="preview-note">Decomposer reads a corpus handle, writes slice handles, then subagents extract and validate those slices.</span>
		</span>
	</a>

	<a class="url-preview" href="https://github.com/rawwerks/recursive-coding-agents/tree/main/claude-dynamic-workflows/not-rlm" target="_blank" rel="noopener noreferrer">
		<span class="preview-caption">
			<span class="preview-source">not-RLM contrast · script-fixed split</span>
			<strong>hardcoded-map-reduce.workflow.js</strong>
			<span class="preview-note">It has handles, subagents, and state, but the windows, fan-out, reducer, and stop rule are fixed in code.</span>
		</span>
	</a>
</div>
</div>

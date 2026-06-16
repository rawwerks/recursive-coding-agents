---
label: OpenProse RLM examples
alt: true
---

## OpenProse explicitly declares subagent work

Here are two OpenProse examples where the model turns an external handle into smaller handles, then verifies the child-work trace.

<div class="prose-program-grid">
	<a class="prose-program" href="https://github.com/rawwerks/recursive-coding-agents/blob/main/openprose/rlm/handle-recursive-reader.prose.md" target="_blank" rel="noopener noreferrer">
		<span class="prose-program-label">Recursive decomposition</span>
		<strong>handle-recursive-reader.prose.md</strong>
		<ul class="prose-program-points">
			<li>Starts from an external <code>prompt_handle</code>; root does not read the whole thing.</li>
			<li>The model decides terminal vs. nonterminal handle.</li>
			<li>Nonterminal handles produce child handles and call the same contract again.</li>
		</ul>
		<pre><code>if nonterminal:
  for child in manifest:
    recurse(child.path)</code></pre>
	</a>

	<a class="prose-program" href="https://github.com/rawwerks/recursive-coding-agents/blob/main/openprose/rlm/directory-handle-slicer.prose.md" target="_blank" rel="noopener noreferrer">
		<span class="prose-program-label">Directory handle slicer</span>
		<strong>directory-handle-slicer.prose.md</strong>
		<ul class="prose-program-points">
			<li>Starts from a repo or directory handle, not copied root context.</li>
			<li>The model uses search to choose relevant file handles for the question.</li>
			<li>Workers inspect only assigned handles; aggregation cites worker evidence.</li>
		</ul>
		<pre><code>manifest = model_slice(directory)
for child in manifest:
  worker(child.path only)
validate worker provenance</code></pre>
	</a>
</div>

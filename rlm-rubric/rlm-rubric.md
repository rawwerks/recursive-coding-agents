# Recursive Language Model Rubric

Use this rubric to decide whether a system is a full Recursive Language Model (RLM), an RLM-family ablation, or merely RLM-adjacent.

For multi-agent or delegated evaluation, use
[`rlm-judging-methodology.md`](rlm-judging-methodology.md) with this rubric. The
methodology treats the rubric as a conformance contract and requires observed
evidence, prompt-shape scoping, negative controls, and adversarial review.

## Source Basis

This rubric is derived from the public RLM source trail and the repo-local
judging methodology:

- [Recursive Language Models paper](https://arxiv.org/abs/2512.24601): especially the abstract, Section 2, Algorithm 1 versus Algorithm 2, and Appendix C.
- [Alex Zhang's original RLM blog post](https://alexzhang13.github.io/blog/2025/rlm/): framing of RLM as a drop-in model-call abstraction.
- [RLMs are the new reasoning models](https://raw.works/rlms-are-the-new-reasoning-models/): synthesis and implementation cautions around cost, time, depth, and recursive behavior.
- [`rlm-judging-methodology.md`](rlm-judging-methodology.md): repo-local conformance methodology.

The key correction is terminological: the prompt/context is not itself "executable state." It is symbolic state bound inside an executable environment.

## Refined Definition

A Recursive Language Model is an inference-time scaffold around a base LM that preserves the outer model-call interface while moving the user prompt or context into a persistent executable environment as symbolic state. The root LM is shown only metadata and handles for that state, then writes programs that inspect, transform, partition, and store intermediate results. From inside the same environment, those programs can invoke sub-LM or sub-RLM calls on programmatically constructed prompt slices or subproblems, including inside loops, and finally return either a direct answer or an environment variable as the model-call result.

## Methodological Guardrails

Classify behavior, not branding. A system calling itself an RLM is not enough; a system avoiding the term RLM is not disqualifying.

Classify the specific run shape. A product can be non-RLM in one mode and a full RLM in another. Important run shapes include:

- plain text prompt only
- prompt with tagged files such as `@file`
- prompt with a directory, repository, database, or search index handle
- prompt with an explicit conversation/session trajectory handle
- API call with structured context fields

The "prompt" does not have to be a string variable named `prompt`. If a user tags a file and the agent uses `rg`, `jq`, `awk`, Python, SQL, or other tools against that file, it is symbolically manipulating prompt/context state. That can satisfy prompt externalization and symbolic-handle gates. It becomes a full recursive RLM only if the other gates also hold, especially programmatic sub-LM/sub-RLM calls over constructed slices.

When subagents judge a target, they must produce an evidence packet before a verdict. A valid evidence packet includes the exact run shape, version or commit, prompt shape, tools enabled, source paths or run IDs, per-gate evidence, strongest case for, strongest case against, tests run, tests not run, and what would change the verdict.

Prefer observed traces over surface names:

- inspect generated scripts, logs, prompts, runtime globals, files, and task records
- check whether raw context was pasted into the root model prompt or held behind a handle
- check whether generated code used deterministic tools to inspect context
- check whether generated code made sub-LM/sub-RLM calls over selected slices
- check whether intermediate state stayed in the environment
- look for counterexamples across prompt shapes before making product-level claims

## Hard Gates

A system is a full RLM only if it passes all hard gates.

| Gate | Criterion | Pass Condition |
|---|---|---|
| G1 | Model-call outer shape | The system can be used like a model call: input prompt/context in, final answer out. |
| G2 | Prompt externalization | The full prompt/context is bound as symbolic state in an environment, not simply pasted into the root model context. |
| G3 | Symbolic handle | The root model can refer to and manipulate the prompt/context through handles such as `context`, tagged files, paths, lists, objects, database rows, search indexes, session logs, or corpus entries. |
| G4 | Persistent executable environment | There is a REPL, runtime, notebook, shell workspace, or equivalent where intermediate state survives across steps. |
| G5 | Programmatic subcalls | Code inside that environment can call sub-LMs or sub-RLMs on constructed slices or subproblems. |
| G6 | Model-chosen decomposition | The model decides how to inspect, split, delegate, aggregate, verify, and stop. |
| G7 | Symbolic intermediate state | Large intermediate artifacts stay in variables, files, or environment state, not all verbalized back into the root context. |

## Classification

| Classification | Meaning |
|---|---|
| Not RLM | Misses one or more hard gates, usually prompt externalization or programmatic subcalls. |
| RLM-adjacent | Shares a nearby mechanism such as tools, agents, retrieval, recursion, code execution, memory, or decomposition. |
| RLM-family ablation | Has prompt externalization and an executable environment, but lacks recursive subcalls. This matches the paper's `RLM(depth=0)` ablation. |
| Full RLM | Passes G1-G7. |
| Production-quality RLM | Full RLM plus max depth, max calls, token/cost budgets, timeouts, sandboxing, tracing, and disciplined final-answer extraction. |

## Litmus Tests

1. Can the root model write a program over a symbolic handle to the prompt/context?
2. Can that program call LMs or RLMs on constructed slices or subproblems?
3. Can those calls occur inside generated loops, maps, filters, graph traversals, or other model-written control flow?
4. Does intermediate state live in the environment rather than being fully re-verbalized into the root model context?
5. Is the final answer produced through the same outer model-call interface?

If the answer to all five is yes, the system is probably an RLM. If it merely has tools, subagents, bash, retrieval, repeated self-calls, or a fixed decomposition workflow, it is adjacent.

## Why Close Systems Are Not RLMs

| System | Why It Feels Close | Why It Fails The Rubric |
|---|---|---|
| Direct long-context model call | It answers over a big context. | Fails G2, G3, G4, and G5. The prompt is still just tokens inside the root model context. |
| Summarization or compaction loop | It manages context length and may iterate. | Usually fails G3, G5, G6, and G7. It compresses context with fixed lossy procedure rather than letting the model programmatically operate over symbolic context. An RLM may choose summarization as one tactic. |
| RAG, BM25, or semantic search | It retrieves slices of external data. | Retrieval can be a tool inside an RLM, but retrieval alone is not recursive programmatic decomposition over prompt-as-environment state. |
| Subagents | They delegate work to other model instances. | Usually fails G5. A parent verbally asking subagents is not the same as code inside an environment calling submodels over constructed context slices. |
| Repeated self-call loop | It recursively calls the model again and again. | Fails G2, G3, G4, and G7. Repetition is not RLM; the system needs external symbolic state and executable control. |
| Ralph-style coding-agent loop | It has bash, durable repo state, and repeated agent invocations. | Passes G4 and G7, but fails G2/G3 and G5. It also fails G6 under the stricter rubric because the outer `while` loop owns continuation and stopping rather than model-written recursive control. |
| Coding agent with bash | It has an executable environment. | Passes G4, and maybe G3, but fails unless prompt/context is externalized and bash can programmatically call sub-LMs/sub-RLMs. Bash alone is not enough. |
| CodeAct | It executes code and may use tools. | Close, but the paper distinguishes it from RLM because CodeAct typically loads context directly into the model rather than offloading prompt state into the code environment. |
| Hardcoded map-reduce pipeline | It splits, delegates, and aggregates. | Fails G6. The decomposition is developer-authored workflow logic rather than model-chosen recursive interaction with context. |
| Tree-of-Thought or self-consistency | It spends inference-time compute exploring alternatives. | Fails G2, G4, and G5. It searches over reasoning traces, not symbolic prompt state in an executable environment. |
| Memory system | It stores and retrieves information over time. | Memory can be implemented with RLM mechanics, but memory alone is not RLM. |

## Borderline Cases

### `RLM(depth=0)`

`RLM(depth=0)` externalizes the prompt into a REPL and lets the model inspect or manipulate it, but has no recursive subcalls. The paper treats this as an RLM ablation. Classify it as RLM-family, not a full recursive RLM.

### Coding Agents

A coding agent becomes RLM-like only when it has all of the following:

1. Context stored as file, environment, runtime, or workspace state.
2. A stable symbolic handle to that context.
3. A callable `llm_query`, `rlm_query`, or equivalent from inside bash/code.
4. Model-written programs that call that function over constructed slices.
5. Persistent intermediate state and final answer assembly.

Without those, it is a coding agent with tools, not an RLM.

### Recursive Coding Agents

A recursive coding agent is a special coding-agent case where the child call is another instance of the coding agent, not merely a bare LM completion. This can satisfy the RLM gates when a run externalizes context, manipulates handles, constructs slices, calls child agents from inside the executable environment, and aggregates symbolic intermediate state.

It is also a distinct operational category. Recursive coding-agent systems add concerns that the minimal RLM definition does not require: workspace isolation, recursive edits, session trees, patch absorption, cleanup, and cost/depth/call guardrails. See [ypi: a recursive coding agent](https://raw.works/ypi-a-recursive-coding-agent/) and [`../web/src/slides/ypi.md`](../web/src/slides/ypi.md) for the YPI example.

## Practical Engineering Notes

Bounds are not the theoretical essence of RLMs, but they are necessary for a usable implementation:

- Set max recursion depth.
- Set max subcalls and fanout.
- Set token, cost, and wall-clock budgets.
- Sandbox execution when context or code is untrusted.
- Persist traces for debugging and evaluation.
- Treat prompts, parsers, batching, final-answer extraction, and scoring logic as first-class versioned artifacts.

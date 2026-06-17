# Claude Code dynamic workflows: RLM vs not-RLM

Claude Code *dynamic workflows* are JavaScript scripts (`*.workflow.js`) that
orchestrate subagents with `agent()`, `parallel()`, `pipeline()`, `phase()`. This
folder classifies them against [`../rlm-rubric/`](../rlm-rubric/). **The folder a
file lives in is its verdict**.

## `rlm/` — these ARE RLMs (pass all of G1–G7)

| file | handle shape | what it shows |
|---|---|---|
| `file-handle-clean.workflow.js` | one file | model-driven map-reduce: a file handle is decomposed into model-chosen slices, one subagent per slice, then validate + aggregate |
| `repo-handle-clean.workflow.js` | repo / directory | decompose a repo handle into per-file handles, read in parallel, validate, aggregate |
| `tree-recursive.workflow.js` | recursive tree | the canonical one: each handle is inspected by its own subagent (branch → child handles, leaf → record); the recursion is discovered from the data, never hardcoded |

In all three, context stays behind handles (never inlined into a root prompt),
sub-LM calls run over model-constructed slices, and intermediate state stays in
the environment.

## `not-rlm/` — nearby shapes that FAIL a gate (calibration)

Read these as a **ladder**: each one fixes the previous failure and trips the next.
That is the whole point — having subagents, loops, code, or slices is not enough.

| file | first gate it FAILS | lesson |
|---|---|---|
| `subagent-fanout-inlined-prompt.workflow.js` | **G2** prompt externalization | the prompt is pasted inline into N subagents; there is no handle to operate on |
| `single-agent-handle-reader.workflow.js` | **G5** programmatic subcalls | it externalizes a handle and uses tools, but a single agent answers — no recursive sub-LM tree |
| `hardcoded-map-reduce.workflow.js` | **G6** model-chosen decomposition | real slices + sub-LM calls + symbolic state (passes G1–G5, G7) — but the split, fan-out, reducer, and stop are developer-authored, not model-chosen |

`hardcoded-map-reduce.workflow.js` is the subtle one — it passes six of seven
gates. Diff it against `rlm/file-handle-clean.workflow.js`: same map-reduce shape,
but there the **model** chooses the decomposition. (Rubric: "Hardcoded map-reduce
pipeline → Fails G6.")

## `proven-run/`

A verified RLM run: the workflow script, the redacted public run summary
(7 agents + a synthetic validator fixture), the corpus, the model-generated
slices, and the assessment. See [`proven-run/README.md`](proven-run/README.md).

# RLM Judging Methodology

Use this methodology when assigning subagents to classify a system against the RLM rubric. The goal is to make the judgment robust to an individual subagent having a weak prompt, missing a nuance, over-trusting branding, or under-testing behavior.

## Core Principle

Subagents should not be treated as authorities. Treat them as evidence collectors and adversarial analysts. The final verdict should come from a reproducible evidence packet plus a deterministic gate adjudication.

The rubric is a contract. The judging process is a conformance harness.

## Evidence Hierarchy

Use stronger evidence before weaker evidence:

1. Observed black-box traces from real runs.
2. Generated scripts, runtime records, subagent transcripts, and tool logs.
3. Source code paths that implement runtime, prompt assembly, context handling, or subcall primitives.
4. Official docs and release notes.
5. Maintainer claims, names, tweets, README slogans, and product positioning.

Branding is never decisive. A project calling itself RLM does not pass by name. A project avoiding the term RLM does not fail by name.

## Required Scope Label

Every judge must classify the exact object under test, not the product in the abstract.

Required scope fields:

- product or repo
- version, commit, or docs date
- mode or configuration tested
- prompt shape tested
- tools enabled
- observed run IDs, logs, scripts, or source files

Examples of valid scope labels:

- "Claude Code 2.1.177 dynamic workflow, plain prompt, no tagged resource."
- "Claude Code 2.1.177 dynamic workflow, tagged file/path resource, one subagent with Bash."
- "Ax 22.0.3 `AxAgent` with `contextFields` and `AxJSRuntime`."
- "Ax plain `AxGen` call without runtime/context fields."

## Prompt Shape Matrix

The prompt/context can be any task-relevant state supplied to the system. Judges must evaluate prompt shapes separately when possible.

| Prompt Shape | What Counts As Symbolic Context |
|---|---|
| Plain text only | User text or conversation text, if bound into runtime state by handle. |
| Tagged file | File path or file object referenced from the prompt, such as `@file`. |
| Repository or directory | Repo path, directory path, file list, search index, or code database handle. |
| Structured API context | Named context fields, object fields, database rows, IDs, handles, or blobs. |
| Session trajectory | Transcript path, message object, conversation handle, or event log. |
| Search-backed corpus | BM25/vector index handle, corpus IDs, document IDs, or queryable store. |

If a user tags a file and the agent uses `rg`, `jq`, `awk`, Python, SQL, or another deterministic tool against that handle, the agent is symbolically manipulating prompt/context state. That can satisfy the symbolic-handle gates for that prompt shape.

It is not enough for full RLM classification by itself. Full RLM also requires programmatic sub-LM or sub-RLM calls over constructed slices or subproblems, model-chosen decomposition, persistent intermediate state, and final answer assembly.

For query-plus-context systems, do not require the root model to be blind to the user query or instructions. G2 is about whether the task context payload is externalized behind a symbolic handle rather than pasted wholesale into the root model context.

Prompt guidance, examples, or task-shape tips do not automatically fail G6. They should be recorded in the scope. The run still needs trace evidence that the model made the concrete runtime choices about inspection, slicing, subcalls, aggregation, verification, and stopping.

## Minimum Probe Suite

A robust judge should run or request probes instead of relying only on docs.

### Probe A: Plain Prompt Runtime Handle

Ask the system to introspect its generated runtime or orchestration environment.

Record:

- runtime globals or visible variables
- whether `prompt`, `messages`, `conversation`, `context`, `args`, or equivalent handles exist
- whether raw prompt/context is pasted into the root context or kept behind a handle
- generated code and run metadata

Expected use: distinguishes "workflow can recurse" from "workflow has prompt-as-state by default."

### Probe B: Tagged Resource Sentinel

Create a small file or structured object with a random sentinel that is not included in the natural-language prompt except via a handle.

Ask the system to recover the sentinel by operating through the handle.

Record:

- sentinel resource path or object ID
- generated script
- subagent prompt or subcall input
- deterministic tool command, such as `rg`, `jq`, `awk`, or SQL
- raw tool result
- whether the sentinel text was hardcoded into the generated script or root prompt

Pass condition for symbolic manipulation: the trace shows the system used the handle to recover information not already present in generated code.

### Probe C: Constructed Slice Or Subproblem Subcall

Give the system a resource with multiple separable sections and require it to:

1. inspect the resource through a handle
2. construct slices, dependency nodes, or subproblems in code
3. call sub-LMs or subagents on those constructed slices
4. aggregate and verify a final answer

Record:

- the slicing logic
- the subcall primitive used
- subcall inputs
- dependency graph or task graph representation, if applicable
- aggregation logic
- verification or checking of subcall outputs
- whether intermediate state stayed outside the root model context

Pass condition for full recursion: generated code made sub-LM/sub-RLM calls over constructed slices or subproblems, not just one manually written delegation prompt.

### Probe D: Negative Control

Run a nearby prompt shape expected to fail or downgrade.

Examples:

- plain prompt with no context handle
- context directly pasted into the root prompt
- fixed developer-authored map-reduce with no model-chosen decomposition
- bash-enabled agent with no callable LM/subagent primitive

Judges must report whether the same product changes classification across these modes.

## Judge Output Contract

Each subagent judge must produce a structured report with these fields:

```json
{
  "scope": {
    "target": "",
    "version_or_commit": "",
    "mode": "",
    "prompt_shape": "",
    "tools_enabled": []
  },
  "evidence": [
    {
      "type": "trace|source|docs|claim",
      "path_or_url": "",
      "lines_or_run_id": "",
      "supports": ["G2", "G3"],
      "summary": ""
    }
  ],
  "gate_assessment": {
    "G1": {"verdict": "pass|fail|partial|conditional|unknown", "evidence": ""},
    "G2": {"verdict": "pass|fail|partial|conditional|unknown", "evidence": ""},
    "G3": {"verdict": "pass|fail|partial|conditional|unknown", "evidence": ""},
    "G4": {"verdict": "pass|fail|partial|conditional|unknown", "evidence": ""},
    "G5": {"verdict": "pass|fail|partial|conditional|unknown", "evidence": ""},
    "G6": {"verdict": "pass|fail|partial|conditional|unknown", "evidence": ""},
    "G7": {"verdict": "pass|fail|partial|conditional|unknown", "evidence": ""}
  },
  "strongest_case_for_rlm": "",
  "strongest_case_against_rlm": "",
  "tests_run": [],
  "tests_not_run": [],
  "classification": "",
  "classification_scope": "",
  "what_would_change_this_verdict": ""
}
```

Rules:

- Use `unknown` when a gate was not tested. Do not silently convert unknown to fail.
- Use `conditional` when a product passes only for some configurations or prompt shapes.
- Record prompt steering and task-shape hints in the scope, but judge G6 from the observed runtime control flow.
- Every pass must cite observed evidence or source paths.
- Every fail must include the strongest plausible contrary interpretation.
- A product-level verdict must summarize all tested run shapes, not collapse them into one label.

## Anti-Skill-Issue System Design

Design the judging system so the subagent can be mediocre and the system still catches it.

1. Calibration fixtures: before judging real targets, require each judge to classify known positives, negatives, and borderlines from this repo.
2. Evidence packet first: require agents to submit traces, scripts, logs, commands, and source paths before verdict prose.
3. Label-blind review: when practical, strip project names and marketing claims from evidence packets so judges focus on behavior.
4. Two-pass adversarial review: one judge writes the strongest RLM case; another writes the strongest non-RLM case from the same evidence.
5. Deterministic adjudicator: a script or lead agent applies hard gates to the structured reports and flags contradictions.
6. Prompt-shape matrix: classify plain prompt, tagged file, repo path, structured context, and session-handle modes separately.
7. Negative controls: every positive claim needs at least one nearby failing or downgraded run shape.
8. Graph/dependency probes: for task-decomposition claims, inspect whether generated code represents dependencies, launches subcalls, and checks their outputs.
9. Trace diffing: compare generated scripts and subcall inputs against sentinel values to detect hardcoding or context leakage.
10. Provenance ledger: every verdict stores command lines, run IDs, versions, costs, and artifact paths.
11. Escalation rule: disagreement, missing probes, or uncited gate passes automatically triggers a fresh run or a stronger reviewer.

## Practical Verdict Format

Prefer verdicts shaped like this:

> "For target X, mode Y, prompt shape Z, observed run R passes G1/G3/G4/G5/G6/G7 and conditionally passes G2 because the file path acted as prompt/context handle. It is a full RLM only if the generated workflow constructs slices and calls submodels over them; this run shows symbolic file-handle manipulation and subagent delegation, but not recursive constructed-slice decomposition."

This avoids the misleading question "Is product X an RLM?" and replaces it with the answerable question "Which run shapes of product X satisfy which gates under observed traces?"

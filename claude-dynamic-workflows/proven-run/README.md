# Proven run — an RLM we actually executed

This is the one run we executed end-to-end and verified as a full RLM: 7 agents
plus a synthetic validator fixture.

| file | what it is |
|---|---|
| `full-rlm-probe-workflow.js` | the workflow script that ran |
| `full-rlm-probe-run.json` | redacted public run summary — agents, synthetic validator fixture, trace |
| `corpus.md` | the input corpus (held behind a handle, never inlined) |
| `prompt.txt` | the task prompt |
| `split_corpus.py` | helper used to prepare the corpus |
| `generated-slices/slice-A…E.md`, `validator.md` | the slices the model constructed during the run |
| `claude-code-full-rlm-workflow-probe.md` / `.json` | the assessment write-up and its structured verdict |

The script here is the example counterpart in
[`../rlm/`](../rlm/) made concrete: a real run, with the evidence that it passes
G1–G7.

Raw Claude session journals and per-agent transcripts stayed in the local Claude
store and are not included here. This folder contains the public-safe copied
workflow, run record, corpus, generated slices, and assessment.

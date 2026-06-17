# OpenProse programs: RLM vs not-RLM

OpenProse programs are Markdown contracts (`*.prose.md`) executed by the OpenProse
VM. This folder classifies them against [`../rlm-rubric/`](../rlm-rubric/). **The
folder a file lives in is its verdict**, and every negative filename also ends in
`-not-rlm`.

## `rlm/` — RLM-complete contracts (pass all of G1–G7)

- `handle-recursive-reader.prose.md` — strict recursive reader over an opaque handle.
- `directory-handle-slicer.prose.md` — slices a directory handle into sub-handles and recurses.
- `opaque-handle-map-reduce.prose.md` — model-driven map-reduce over an opaque handle.

## `not-rlm/` — nearby shapes that FAIL a gate (calibration)

These examples are intentionally graded generously: if a coding-agent-like shape
has a persistent runtime, a handle, symbolic files, subagents, or loops, credit
that mechanism. The verdict should turn on the missing RLM gate, not on a vague
"agents are not RLMs" shortcut.

- `subagents-only-not-rlm.prose.md` — delegates the same already-inlined prompt
  to reviewers. Even if the reviewer fanout is counted as model calls, there is
  no external prompt handle, no model-constructed slice manifest, and no
  symbolic handle state, so it fails **G2/G3/G7** and does not satisfy the
  constructed-slice reading of **G5**.
- `bash-only-symbolic-reader-not-rlm.prose.md` — reads context symbolically with
  bash but never makes programmatic sub-LM calls, so it **fails G5**.
- `ralph-loop-not-rlm.prose.md` — a coding-agent-style outer loop over a handle.
  Grant it the executable environment and handle-shaped context. It is still not
  a full RLM because it does not recursively call over child handles, does not
  aggregate independent child results, and the outer loop owns continuation and
  stopping, so it **fails G5/G6/G7**.

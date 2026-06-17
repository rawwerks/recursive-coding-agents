# Agent Notes

Audience: coding agents maintaining the RLM rubric.

## Boundary

`README.md` is for external readers and evaluators. Put maintainer notes here.

## Sync Rules

- Keep `rlm-rubric.md` and `rlm-rubric.json` semantically aligned.
- Keep `rlm-judging-methodology.md` and `rlm-judging-methodology.json`
  semantically aligned.
- Do not loosen G1-G7 casually; the example folders depend on these gates as
  calibration fixtures.
- When changing classifications, update the corresponding examples in
  `../claude-dynamic-workflows/` and `../openprose/` or document why they still
  stand.

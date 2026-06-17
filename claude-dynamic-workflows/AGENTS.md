# Agent Notes

Audience: coding agents maintaining Claude Code workflow examples.

## Boundary

`README.md` is for external readers and evaluators. Put maintainer notes here.

## Verdict Layout

- `rlm/` contains positive examples that should pass all G1-G7 gates.
- `not-rlm/` contains negative controls. Do not use these as positive templates.
- The directory name is part of the public verdict, so moving a file changes the
  claim.

## Maintenance Rules

- Keep examples synchronized with `../rlm-rubric/`.
- Preserve negative controls that fail different gates; they are calibration
  fixtures, not dead code.
- If adding an executed trace, redact local paths, raw session journals, runtime
  IDs, account metadata, and prompt previews before committing.

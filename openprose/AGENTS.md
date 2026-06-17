# Agent Notes

Audience: coding agents maintaining OpenProse examples.

## Boundary

`README.md` is for external readers and evaluators. Put maintainer notes here.

## Verdict Layout

- `rlm/` contains positive examples that should pass all G1-G7 gates.
- `not-rlm/` contains negative controls.
- Negative filenames should keep the `-not-rlm.prose.md` suffix.

## Maintenance Rules

- Keep examples synchronized with `../rlm-rubric/`.
- Preserve the contrast between subagents-only, bash-only symbolic reading, and
  outer-loop control. They fail different gates and are useful calibration
  fixtures.
- Prompts/specs are first-class artifacts; avoid hardcoding prompt logic in
  unrelated implementation files.

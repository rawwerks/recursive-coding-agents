# Agent Notes

Audience: coding agents maintaining the public proven-run artifact.

## Boundary

`README.md` is for external readers. Put maintainer notes here.

## Public-Safety Rules

- Do not commit raw Claude session journals or per-agent transcripts.
- Raw Claude session journals and per-agent transcripts stayed in the local
  Claude store; keep that storage detail out of public README prose.
- Do not commit local Claude-store paths, runtime IDs, account metadata, token
  counts, or prompt previews.
- The validator value in this folder is a synthetic fixture, not a credential.
- Keep `full-rlm-probe-run.json` and
  `claude-code-full-rlm-workflow-probe.md` aligned when changing the artifact.

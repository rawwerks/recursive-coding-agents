# Agent Notes

Audience: coding agents maintaining the public proven-run artifact.

## Boundary

`README.md` is for external readers. Put maintainer notes here.

## Public-Safety Rules

- Do not commit raw Claude session journals or per-agent transcripts.
- Keep storage details out of public README prose.
- Do not commit local/private paths, runtime IDs, account metadata, token counts,
  or prompt previews.
- The validator value in this folder is a synthetic fixture, not a credential.
- Keep `full-rlm-probe-run.json` and
  `claude-code-full-rlm-workflow-probe.md` aligned when changing the artifact.

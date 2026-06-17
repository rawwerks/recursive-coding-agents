# Visual QA / QC

The deck is now treated as visually polished. Layout audits are guardrails, not
permission to compress, crop, or reflow approved slides.

## Default Rule

When a visual assertion fails, first produce evidence and a proposal. Do not
change polished slide composition just to satisfy a mathematical check unless
the user explicitly approves the tradeoff.

## Lightweight Planning Pass

Run this before visual/layout changes:

```bash
bun run visual:qc -- --intent "What visual problem this change is meant to solve"
```

This does not launch Chromium and does not touch the live site. It writes:

- `manifest.json` with changed files, risk, affected slides, and required artifacts
- `review.md` with a hurt-check prompt for a reviewer/subagent

By default the report is written under:

```txt
~/scratch/recursive-coding-agents-talk/visual-qc/<timestamp>/
```

Use `--require-intent` when gating a high-risk visual change.

## Artifact Capture

The full design audit can optionally persist failure artifacts:

```bash
VISUAL_QA_ARTIFACTS=1 bun run test:design
```

On instrumented visual assertion failure, it writes a manifest plus screenshots
for affected slides under:

```txt
~/scratch/recursive-coding-agents-talk/visual-qa/artifacts/<timestamp>/
```

Only run the full audit when it is appropriate to exercise the local deck. Do
not use it against the live site.

## Hurt Check

For medium/high-risk visual changes, the reviewer should compare before/after
screenshots for affected slides only and answer:

1. PASS or FAIL.
2. Which slides got worse, if any.
3. Whether text/object alignment, crop, line wrapping, overlap, footer/dot
   interference, or visual rhythm regressed.
4. Whether the change fixed a math assertion by making a polished slide worse.

If the answer is not clearly PASS, stop and propose options before editing more.

## Risk Guidance

- High risk: global CSS, `Slide.svelte`, `Deck.svelte`, `src/routes/+page.svelte`.
- Medium risk: slide markdown, visual components, screenshots/assets.
- Low risk: docs and visual-QC harness code.

High-risk changes need intent, affected-slide screenshots, geometry, and a
hurt-check note before commit.

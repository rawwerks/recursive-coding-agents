# Agent Notes

Audience: coding agents editing the SvelteKit deck/site.

## Boundary

`README.md` in this folder is for external readers. Put maintainer workflow in
`../DEVELOPING.md` and agent-specific notes here.

## Workflows

```bash
cd web
bun run check
bun run test:design
bun run test:theme
bun run build
```

For visual/layout changes, start with:

```bash
bun run visual:qc -- --intent "What visual problem this change is meant to solve"
```

The deck should be treated as already polished. See `VISUAL_QC.md` before
changing global CSS, slide composition, image crops, carousel sizing, or footer
and dot placement.

## Editing Notes

- Slide content lives in `src/slides/*.md`; slide order lives in
  `src/slides/order.ts`.
- Keep layout changes covered by `scripts/assert-slide-layout.mjs`.
- Keep `ASSETS.md` updated when adding or replacing images/screenshots.
- `PRODUCT.md`, `DESIGN.md`, and `.impeccable/` are maintainer-facing but
  public-safe.
- Local/generated files must stay ignored: `node_modules/`, `.svelte-kit/`,
  `.wrangler/`, `.env*`, and `.dev.vars*`.

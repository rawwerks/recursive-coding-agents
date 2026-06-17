# Developing

Audience: human maintainers and developer agents working on this repo. This file
is public-safe, but it is not the external landing page.

## Local setup

```bash
cd web
bun install
bun run dev          # http://localhost:5173
```

Edit slide content in `web/src/slides/*.md` and reorder slides in
`web/src/slides/order.ts`.

## Checks

Run these from `web/`:

```bash
bun run check        # svelte-check
bun run test:design  # browser layout assertions across desktop/mobile viewports
bun run test:social  # Open Graph/Twitter metadata and image dimensions
bun run test:theme   # static + rendered theme assertions
bun run build        # production build
```

Before publishing or committing public-facing changes, also run:

```bash
gitleaks dir . --redact --no-banner
git diff --check
```

## Git hooks

Shared hooks live in `.githooks/`. Activate them once per clone:

```bash
git config core.hooksPath .githooks
```

The pre-commit hook runs `gitleaks git --staged --redact --no-banner`.
The pre-push hook does not deploy; it only reminds maintainers that site deploys
are explicit.

## Site build and deploy

The site builds to a Cloudflare Worker with static assets via
`@sveltejs/adapter-cloudflare`. Build output and asset binding are configured in
`web/wrangler.jsonc`.

```bash
cd web
bun run build
bun run deploy:dry   # build + wrangler deploy --dry-run
bun run deploy       # build + wrangler deploy
bun run cf:dev       # build + local Workers runtime
```

From the repo root, prefer the checked wrapper:

```bash
scripts/deploy-web.sh --dry-run
scripts/deploy-web.sh
```

Production deploys require maintainer Cloudflare/Wrangler authentication for the
configured custom-domain routes. Do not pass tokens on command lines; use local
Wrangler auth or a private CI secret.

## Deck authoring

Slides are mdsvex files. A typical slide looks like:

```md
---
label: OpenProse
variant: split
alt: true
eyebrow: For almost any coding agent
---

## A language compiled by the agent, not the computer.

Slide body content can use Markdown, HTML, and Svelte components.
```

`<Slide>` metadata supported by `web/src/routes/+page.svelte`:

| Prop | Type | Purpose |
| --- | --- | --- |
| `label` | `string` | Accessible name for the slide navigation dot. |
| `variant` | `default`, `title`, `section`, `split`, `quote`, `code`, `grid`, `image` | Slide layout mode. |
| `alt` | `boolean` | Uses the alternate deck background. |
| `align` | `left` or `center` | Horizontal alignment of the content block. |
| `background` | CSS color string | Custom background for one slide. |

## Theme and design artifacts

- `web/src/lib/themes/active.ts` stores the checked-in shadcn/tweakcn theme.
- `web/DESIGN.md` is the public-safe design brief for maintainers.
- `web/PRODUCT.md` is the public-safe product brief for maintainers.
- `web/.impeccable/` contains shared design-system configuration; local live-edit
  state and per-developer runtime files are ignored.

## Asset provenance

Bundled preview images and screenshots are listed in `web/ASSETS.md`. Keep that
file updated when adding or replacing visual evidence.

## Public/private boundary

All checked-in docs should be safe for a public repo. Private operational context
for agents belongs in mycelium/git notes, not in markdown files.

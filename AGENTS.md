# Agent Notes

Audience: coding agents maintaining this repo.

## Mission

Keep `README.md` as an external landing page for the public audience. Put
maintainer workflow in `DEVELOPING.md`; put agent-only operating notes here or in
mycelium/git notes when they should not be public prose.

## Repo Map

```text
web/                       SvelteKit deck/site
rlm-rubric/                public RLM rubric and judging method
claude-dynamic-workflows/  public Claude Code RLM/not-RLM examples
openprose/                 public OpenProse RLM/not-RLM examples
scripts/deploy-web.sh      checked Cloudflare deploy wrapper
```

## Required Checks

```bash
cd web
bun run check
bun run test:design
bun run test:theme
bun run build
cd ..
gitleaks dir . --redact --no-banner
git diff --check
```

Use `bun`, not `npm`. Keep generated directories ignored: `web/node_modules/`,
`web/.svelte-kit/`, and `web/.wrangler/`.

## Public-Readiness Rules

- Do not put secrets, private logs, local account IDs, raw session journals, or
  per-agent transcripts in tracked files.
- If adding visual assets, update `web/ASSETS.md` with provenance.
- If changing layout, run `bun run test:design`; it checks desktop/mobile slide
  fit, navigation, dot placement, and carousel behavior.
- If changing theme tokens, run `bun run test:theme`.
- Keep `web/src/lib/BenchmarkTweetsCarousel.svelte` tracked whenever
  `web/src/slides/too-hot-to-benchmark.md` imports it.

## Notes

- `web/PRODUCT.md` and `web/DESIGN.md` are maintainer-facing but public-safe.
- Private operational context for future agents belongs in mycelium/git notes.
- Deploying production requires maintainer Cloudflare/Wrangler authentication;
  never pass credentials as command-line arguments.

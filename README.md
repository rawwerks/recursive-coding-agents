# recursive-coding-agents

Talk and website for **Recursive Coding Agents** — Raymond Weitekamp (OpenProse),
AI Engineer World's Fair 2026.

## Layout

```
recursive-coding-agents/
└── web/        SvelteKit deck + website (the slides are the site)
```

The deck is a real, server-rendered, mobile-responsive website that also works as
a full-screen presentation. Everything that ships lives under `web/`.

## Develop

```bash
cd web
bun install
bun run dev          # http://localhost:5173
```

## Build & deploy (Cloudflare)

The site builds to a Cloudflare Worker with static assets via
[`@sveltejs/adapter-cloudflare`](https://svelte.dev/docs/kit/adapter-cloudflare).
Build output and the asset binding are configured in `web/wrangler.jsonc`.

```bash
cd web
bun run build        # emits web/.svelte-kit/cloudflare/
bun run deploy:dry   # build + `wrangler deploy --dry-run` (no upload)
bun run deploy       # build + `wrangler deploy`
bun run cf:dev       # build + `wrangler dev` (local Workers runtime)
```

For Cloudflare's Git-connected builds, set the project **root directory** to
`web/`, build command `bun run build`, and let Wrangler pick up `wrangler.jsonc`.

See `web/README.md` for slide authoring, theming, and the full app docs.

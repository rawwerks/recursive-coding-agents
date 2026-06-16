# Recursive Coding Agents Talk Site

A **website that is also the presentation deck** for Raymond Weitekamp's
Recursive Coding Agents talk at AI Engineer World's Fair 2026. Full-screen
slides are navigable by scroll, swipe, or keyboard, while still rendering as a
normal mobile-responsive website.

- **Mobile-responsive**: slides reflow; they do not shrink a fixed canvas.
- **Navigate**: vertical scroll / swipe, Arrow keys, PageUp/PageDown, Home/End, Space.
- **Deep-linkable**: every slide has a `#slide-N` URL; the position dots are real anchors.
- **Real website**: server-rendered and prerendered, readable with JavaScript disabled, indexable.
- **shadcn-ready**: Tailwind v4 + shadcn-svelte components live in `src/lib/components/ui`.
- **Themeable**: load shadcn/tweakcn registry themes into one active local theme artifact.

Built with SvelteKit 2, Svelte 5, Tailwind v4, mdsvex, shadcn-svelte, and the
Cloudflare adapter.

## Quick start

```bash
bun install
bun run dev          # http://localhost:5173
```

Then edit `src/slides/*.md` or `src/slides/order.ts` and save — content is
hot-reloaded.

```bash
bun run build        # production build
bun run preview      # preview the production build
bun run check        # type-check (svelte-check)
bun run test:theme   # static + browser assertions for imported theme tokens
bun run theme:default # restore the checked-in Zen Inspired tweakcn theme
bun run theme:import  # import a shadcn/tweakcn registry theme
```

## Authoring slides

Slides live in **`src/slides/*.md`** as mdsvex files. Reorder the talk in
**`src/slides/order.ts`**. `src/routes/+page.svelte` loads the ordered slide
modules and owns the talk-specific global layout styles.

```md
---
label: OpenProse
variant: split
alt: true
eyebrow: For (almost) any coding agent
---

## A language compiled by the agent, not the computer.

Slide body content can use Markdown, HTML, and Svelte components.
```

### `<Slide>` props

| Prop         | Type                  | Default  | What it does                                            |
| ------------ | --------------------- | -------- | ------------------------------------------------------- |
| `label`      | `string`              | —        | Accessible name for the slide's position dot.           |
| `alt`        | `boolean`             | `false`  | Uses the alternate (`--deck-bg-alt`) background.        |
| `align`      | `'left' \| 'center'`  | `'left'` | Horizontal alignment of the content block.              |
| `background` | `string` (CSS color)  | —        | Custom background for just this slide.                  |

### Content classes

Defined globally in `src/app.css` so every slide can share them — or write your own:
`eyebrow`, `title`, `heading`, `sub`, `hint`, `points` / `lead` / `support`,
`quote`, `cite`, `cta`, `footer`.

## Theming

The active shadcn theme lives in **`src/lib/themes/active.ts`**. The layout renders
that registry item into CSS variables on the server, so the first paint already has
the correct theme. The checked-in default is tweakcn's
[Zen Inspired Theme](https://tweakcn.com/themes/cmlm03etv000204lh15608kec).

Restore the default:

```bash
bun run theme:default
```

Import a public tweakcn/shadcn theme page, registry endpoint, or bare theme id:

```bash
bun run theme:import https://tweakcn.com/themes/cmlm03etv000204lh15608kec
bun run theme:import cmlm03etv000204lh15608kec
bun run theme:import https://tweakcn.com/r/themes/modern-minimal.json
```

Or import a local registry item:

```bash
bun run theme:import ./my-theme.json
```

tweakcn saved themes use the same registry shape when their `/r/themes/<id>` URL is
public. Private v0 chats and private tweakcn themes are not readable by this script;
export or save the registry JSON first, then import the local file.

Deck-level tokens are namespaced and map to shadcn variables by default:

```css
:root {
  --deck-bg: var(--background);
  --deck-text: var(--foreground);
  --deck-accent: var(--primary);
  --fs-title: clamp(2.2rem, 7vw, 5rem);
  --maxw: 880px;
}
```

Use `src/app.css` for slide-specific layout/type scale and
`src/routes/layout.css` for Tailwind/shadcn plumbing.

## How it works

- **`src/routes/+page.svelte`** — loads mdsvex slide files according to
  `src/slides/order.ts` and applies talk-specific global slide styles.
- **`src/lib/Deck.svelte`** — the scroll-snap viewport. Handles keyboard nav, tracks
  the active slide with an `IntersectionObserver`, and renders the position dots
  (a client-side enhancement). Smooth-scroll and the entrance animation switch off
  under `prefers-reduced-motion`.
- **`src/lib/Slide.svelte`** — one `100dvh` snap section. Claims a stable `#slide-N`
  id via a tiny context registry (`src/lib/deck.ts`), and fades/rises in with a
  **native CSS scroll-driven animation** (no JS).
- The core paging (snap, swipe, centering) is pure CSS; the only JavaScript is
  keyboard nav + the active-dot observer.
- **`src/lib/shadcn-theme.ts`** — converts a shadcn registry item into safe CSS
  custom properties for `:root` and `.dark`, with selectors specific enough to
  win over the fallback shadcn tokens in `layout.css`.

## Deploy

This repo deploys with `@sveltejs/adapter-cloudflare` and Wrangler. Build output
and the asset binding are configured in `wrangler.jsonc`.

```bash
bun run build
bun run deploy:dry
bun run deploy
```

Cloudflare Git-connected builds should use this directory (`web/`) as the project
root and `bun run build` as the build command.

## License

MIT

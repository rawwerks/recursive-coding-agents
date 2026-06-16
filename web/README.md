# SvelteKit Presentation Starter

A **website that is also a presentation deck**. Full-screen slides you navigate by
scroll, swipe, or arrow keys, but it remains a normal server-rendered,
mobile-responsive website at a real URL.

- **Mobile-responsive**: slides reflow; they do not shrink a fixed canvas.
- **Navigate**: vertical scroll / swipe, Arrow keys, PageUp/PageDown, Home/End, Space.
- **Deep-linkable**: every slide has a `#slide-N` URL; the position dots are real anchors.
- **Real website**: server-rendered and prerendered, readable with JavaScript disabled, indexable.
- **shadcn-ready**: Tailwind v4 + shadcn-svelte components live in `src/lib/components/ui`.
- **Themeable**: load shadcn/tweakcn registry themes into one active local theme artifact.

Built with SvelteKit 2, Svelte 5, Tailwind v4, and shadcn-svelte. The `zero-dep`
branch preserves the minimal SvelteKit-only starter.

## Quick start

```bash
bun install
bun run dev          # http://localhost:5173
```

Then edit `src/routes/+page.svelte` and save — content is hot-reloaded.

```bash
bun run build        # production build
bun run preview      # preview the production build
bun run check        # type-check (svelte-check)
bun run test:theme   # static + browser assertions for imported theme tokens
bun run theme:default # restore the checked-in Zen Inspired tweakcn theme
bun run theme:import  # import a shadcn/tweakcn registry theme
```

## Authoring slides

Everything lives in **`src/routes/+page.svelte`**. A slide is a `<Slide>` block —
add, remove, or reorder them and the ids + position dots update automatically.

```svelte
<Deck label="My talk">
  <Slide label="Intro">
    <p class="eyebrow">Acme</p>
    <h1 class="title">A big opening statement.</h1>
    <p class="sub">A supporting line underneath.</p>
  </Slide>

  <Slide label="Details" alt>
    <h2 class="heading">Section heading</h2>
    <!-- any HTML you want -->
  </Slide>

  <Slide label="Close" align="center" background="#0b1f1a">
    <h2 class="title">Thanks.</h2>
    <a class="cta" href="https://acme.com">acme.com</a>
  </Slide>
</Deck>
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

`adapter-auto` detects Vercel / Netlify / Cloudflare Pages automatically — just connect
the repo and deploy.

For a **plain static site** (GitHub Pages, S3, any CDN):

```bash
bun add -d @sveltejs/adapter-static
```

```js
// svelte.config.js
import adapter from '@sveltejs/adapter-static';
// kit: { adapter: adapter() }
```

The deck is already `prerender = true`, so it exports to static HTML with no extra config.

## License

MIT

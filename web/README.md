# Recursive Coding Agents Talk Site

Source for the public deck at **https://recursivecodingagents.com**.

The site is a SvelteKit presentation: full-screen slides are navigable by scroll,
swipe, keyboard, or deep links, while still rendering as a normal responsive web
page.

## What readers should know

- The slide content lives in [`src/slides/`](src/slides/).
- The public visual assets are documented in [`ASSETS.md`](ASSETS.md).
- The deck cites the RLM rubric and example folders in the repo root.
- The site is designed to remain readable without JavaScript and indexable as a
  public web artifact.

## Public site features

- **Responsive deck:** slides reflow instead of shrinking a fixed canvas.
- **Deep links:** every slide has a stable `#slide-N` URL.
- **Keyboard navigation:** arrow keys, PageUp/PageDown, Home/End, Space, and
  1-9 / 0 slide shortcuts.
- **Evidence-first design:** paper previews, article cards, repo cards, and
  public screenshot references support the claims.
- **Reduced-motion support:** scroll and entrance animations respect system
  motion preferences.

## Related public docs

- [`../rlm-rubric/README.md`](../rlm-rubric/README.md) — RLM definition and gates.
- [`../claude-dynamic-workflows/README.md`](../claude-dynamic-workflows/README.md)
  — Claude Code workflow examples.
- [`../openprose/README.md`](../openprose/README.md) — OpenProse examples.
- [`../DEVELOPING.md`](../DEVELOPING.md) — local setup, checks, and deploy notes.

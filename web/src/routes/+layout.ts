// Render slides on the server so the deck works as a normal website — content
// is present in the served HTML (indexable, readable with JS disabled) — and is
// statically prerendered at build time. Keyboard / dot navigation hydrates on
// the client as a progressive enhancement.
export const prerender = true;
export const ssr = true;

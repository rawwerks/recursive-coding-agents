import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { mdsvex } from 'mdsvex';

/** @type {import('mdsvex').MdsvexOptions} */
const mdsvexOptions = {
	extensions: ['.md']
};

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Treat .md as Svelte components so slides can live in src/slides/*.md
	extensions: ['.svelte', '.md'],
	preprocess: [vitePreprocess(), mdsvex(mdsvexOptions)],
	kit: {
		// Cloudflare Workers (static assets + a thin SSR worker). Build with
		// `bun run build`, deploy with `wrangler deploy`. The output dir and
		// asset binding are read from wrangler.jsonc at build time. The deck is
		// fully prerendered (see src/routes/+layout.ts), so the worker only
		// handles fallbacks / 404s.
		adapter: adapter()
	}
};

export default config;

import adapter from '@sveltejs/adapter-auto';
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
		// adapter-auto picks Vercel / Netlify / Cloudflare automatically.
		// For a plain static site (GitHub Pages, S3, any CDN) swap this for
		// @sveltejs/adapter-static — see the README "Deploy" section.
		adapter: adapter()
	}
};

export default config;

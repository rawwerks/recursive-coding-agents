import { getContext, setContext } from 'svelte';

/**
 * Tiny registry shared from <Deck> to its <Slide> children via context.
 * Each slide calls `register()` once at init to claim a stable 1-based number,
 * which becomes its `#slide-N` deep-link id. The counter is a plain (non-reactive)
 * object on purpose — it runs during render on both server and client in document
 * order, so the ids match and there is no hydration mismatch.
 */
export interface DeckRegistry {
	register(): number;
}

const KEY = Symbol('deck');

/** Called once inside <Deck>. Returns a fresh registry and publishes it to context. */
export function createDeckRegistry(): DeckRegistry {
	const state = { count: 0 };
	const registry: DeckRegistry = {
		register: () => (state.count += 1)
	};
	setContext(KEY, registry);
	return registry;
}

/** Called inside <Slide> to reach the parent <Deck>'s registry. */
export function getDeckRegistry(): DeckRegistry {
	const registry = getContext<DeckRegistry | undefined>(KEY);
	if (!registry) {
		throw new Error('<Slide> must be used inside a <Deck>.');
	}
	return registry;
}

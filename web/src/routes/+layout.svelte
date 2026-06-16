<script lang="ts">
	import { shadcnThemeStyleTag } from '$lib/shadcn-theme';
	import { activeTheme } from '$lib/themes/active';
	import './layout.css';
	import '../app.css';

	let { children } = $props();

	const activeThemeStyle = shadcnThemeStyleTag(activeTheme);
</script>

<svelte:head>
	{@html activeThemeStyle}
</svelte:head>

{@render children()}

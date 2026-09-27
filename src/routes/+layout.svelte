<script lang="ts">
	import '@fontsource/fredoka/400.css';
	import '@fontsource/fredoka/500.css';
	import '@fontsource/fredoka/600.css';
	import '@fontsource/fredoka/700.css';
	import '../app.css';

	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}

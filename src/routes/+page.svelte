<script lang="ts">
	import { game } from '$lib/game/game.svelte';
	import CoinFlights from '$lib/components/CoinFlights.svelte';
	import DreamReached from '$lib/components/DreamReached.svelte';
	import Greeting from '$lib/components/Greeting.svelte';
	import HUD from '$lib/components/HUD.svelte';
	import JobBoard from '$lib/components/JobBoard.svelte';
	import Setup from '$lib/components/Setup.svelte';
	import StartScreen from '$lib/components/StartScreen.svelte';
	import Store from '$lib/components/Store.svelte';
	import TaskFeed from '$lib/components/TaskFeed.svelte';
	import TaskTidy from '$lib/components/TaskTidy.svelte';
	import TaskWater from '$lib/components/TaskWater.svelte';
	import TuckIn from '$lib/components/TuckIn.svelte';
	import Toasts from '$lib/components/Toasts.svelte';

	const phase = $derived(game.state.phase);

	// Any in-day scene shows the HUD; Grown-up Setup and the title screen do not.
	const inDay = $derived(phase !== 'setup' && phase !== 'start');
</script>

<div class="app">
	{#if inDay}
		<HUD coins={game.state.coins} jarCoins={game.state.jarCoins} day={game.state.day} />
	{/if}

	<main class="stage">
		{#key phase}
			{#if phase === 'setup'}
				<Setup mode="name" />
			{:else if phase === 'start'}
				<StartScreen />
			{:else if phase === 'greeting'}
				<Greeting />
			{:else if phase === 'chores'}
				<JobBoard />
			{:else if phase === 'task-tidy'}
				<TaskTidy />
			{:else if phase === 'task-water'}
				<TaskWater />
			{:else if phase === 'task-feed'}
				<TaskFeed />
			{:else if phase === 'store'}
				<Store />
			{:else if phase === 'dream-reached'}
				<DreamReached />
			{:else if phase === 'tuck-in'}
				<TuckIn />
			{/if}
		{/key}
	</main>

	<Toasts />
	<CoinFlights />
</div>

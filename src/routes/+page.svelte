<script lang="ts">
	import { game } from '$lib/game/game.svelte';
	import CoinFlights from '$lib/components/CoinFlights.svelte';
	import Friend from '$lib/components/Friend.svelte';
	import GoalPick from '$lib/components/GoalPick.svelte';
	import GoalReached from '$lib/components/GoalReached.svelte';
	import Greeting from '$lib/components/Greeting.svelte';
	import Hunger from '$lib/components/Hunger.svelte';
	import HUD from '$lib/components/HUD.svelte';
	import Jars from '$lib/components/Jars.svelte';
	import Setup from '$lib/components/Setup.svelte';
	import Shelf from '$lib/components/Shelf.svelte';
	import StartScreen from '$lib/components/StartScreen.svelte';
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
			{:else if phase === 'task-tidy'}
				<TaskTidy />
			{:else if phase === 'task-water'}
				<TaskWater />
			{:else if phase === 'hunger'}
				<Hunger />
			{:else if phase === 'friend'}
				<Friend />
			{:else if phase === 'shelf'}
				<Shelf />
			{:else if phase === 'jars'}
				<Jars />
			{:else if phase === 'goal-reached'}
				<GoalReached />
			{:else if phase === 'goal-pick'}
				<GoalPick />
			{:else if phase === 'tuck-in'}
				<TuckIn />
			{/if}
		{/key}
	</main>

	<Toasts />
	<CoinFlights />
</div>

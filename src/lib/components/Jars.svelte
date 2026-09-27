<script lang="ts">
	import { GOAL_COST, GOAL_LABELS } from '$lib/game/economy';
	import { actions, game } from '$lib/game/game.svelte';
	import { lines } from '$lib/game/lines';
	import { speak } from '$lib/game/speech';
	import Bubble from './Bubble.svelte';
	import Coin from './Coin.svelte';
	import GoalItem from './GoalItem.svelte';
	import Jar from './Jar.svelte';

	let spoke = $state(false);
	$effect(() => {
		if (spoke) return;
		spoke = true;
		speak(lines.jars(game.state));
	});

	const flies = $derived(Array.from({ length: Math.min(game.state.jarCoins, 8) }, (_, i) => i));
</script>

<div class="scene jars">
	<Bubble tail="center">Clink, clink! Into the jar!</Bubble>

	<div class="jar-zone">
		{#each flies as i (i)}
			<span class="fly-coin" style="--i: {i}" aria-hidden="true"><Coin size={46} /></span>
		{/each}
		<Jar fill={game.state.jarCoins} capacity={GOAL_COST} size={196} />
	</div>

	<div class="goal-target">
		<GoalItem kind={game.state.goal} size={54} />
		<span>Saving for the {GOAL_LABELS[game.state.goal]}</span>
	</div>

	<button type="button" class="btn btn-primary btn-huge" data-testid="jars-continue" onclick={() => actions.jarsDone()}>
		All done!
	</button>
</div>

<style>
	.jar-zone {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		padding-top: 30px;
	}

	.fly-coin {
		position: absolute;
		top: 0;
		left: 50%;
		margin-left: -23px;
		animation: coin-drop 1.1s cubic-bezier(0.3, 0.9, 0.4, 1) both;
		animation-delay: calc(var(--i) * 0.11s);
	}

	@keyframes coin-drop {
		0% {
			opacity: 0;
			transform: translateY(-34px) scale(0.6);
		}
		30% {
			opacity: 1;
		}
		100% {
			opacity: 0;
			transform: translateY(74px) scale(0.95);
		}
	}

	.goal-target {
		display: flex;
		align-items: center;
		gap: 10px;
		background: rgba(255, 253, 248, 0.9);
		border-radius: 999px;
		padding: 6px 18px;
		font-size: 18px;
		font-weight: 600;
		color: var(--ink-soft);
		box-shadow: 0 4px 0 rgba(74, 55, 40, 0.08);
	}
</style>

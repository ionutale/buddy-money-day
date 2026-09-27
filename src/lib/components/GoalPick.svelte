<script lang="ts">
	import { GOAL_LABELS } from '$lib/game/economy';
	import { actions, game } from '$lib/game/game.svelte';
	import { lines } from '$lib/game/lines';
	import { speak } from '$lib/game/speech';
	import { sounds } from '$lib/game/sounds';
	import { nextGoalOptions } from '$lib/game/state';
	import Bubble from './Bubble.svelte';
	import GoalItem from './GoalItem.svelte';

	let spoke = $state(false);
	$effect(() => {
		if (spoke) return;
		spoke = true;
		speak(lines.goalPick(game.state));
	});

	const options = $derived(nextGoalOptions(game.state));

	function pick(id: (typeof options)[number]): void {
		sounds.pop();
		actions.pickGoal(id);
	}
</script>

<div class="scene goal-pick">
	<Bubble tail="center">What should we save for next?</Bubble>

	<div class="goal-cards">
		{#each options as id (id)}
			<button
				type="button"
				class="goal-card"
				data-testid="goal-option-{id}"
				aria-label="Save for the {GOAL_LABELS[id]}"
				onclick={() => pick(id)}
			>
				<GoalItem kind={id} size={104} />
				<span class="goal-name">{GOAL_LABELS[id]}</span>
			</button>
		{/each}
	</div>
</div>

<style>
	.goal-cards {
		display: flex;
		gap: 12px;
		width: 100%;
		justify-content: center;
	}

	.goal-card {
		flex: 1;
		max-width: 156px;
		min-height: 190px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: flex-end;
		gap: 10px;
		padding: 16px 8px 18px;
		border: none;
		border-radius: 32px;
		background: #fffdf8;
		box-shadow: 0 7px 0 rgba(74, 55, 40, 0.12), 0 14px 26px rgba(74, 55, 40, 0.12);
		cursor: pointer;
		transition: transform 0.15s ease, box-shadow 0.15s ease;
	}

	.goal-card:active {
		transform: translateY(5px);
		box-shadow: 0 2px 0 rgba(74, 55, 40, 0.14), 0 8px 14px rgba(74, 55, 40, 0.1);
	}

	.goal-card:focus-visible {
		outline: 4px solid var(--sky);
		outline-offset: 3px;
	}

	.goal-card:hover {
		transform: translateY(-4px) rotate(-1deg);
	}

	.goal-name {
		font-size: 17px;
		font-weight: 600;
		color: var(--ink-soft);
		text-align: center;
	}
</style>

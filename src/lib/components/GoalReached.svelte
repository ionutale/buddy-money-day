<script lang="ts">
	import { GOAL_LABELS } from '$lib/game/economy';
	import { actions, game } from '$lib/game/game.svelte';
	import { buddyName, lines } from '$lib/game/lines';
	import { speak } from '$lib/game/speech';
	import { sounds } from '$lib/game/sounds';
	import Buddy from './Buddy.svelte';
	import Bubble from './Bubble.svelte';
	import GoalItem from './GoalItem.svelte';

	let spoke = $state(false);
	$effect(() => {
		if (spoke) return;
		spoke = true;
		speak(lines.goalReached(game.state));
		sounds.chime();
	});
</script>

<div class="scene goal-reached">
	<Bubble tail="center">You saved six coins!</Bubble>

	<div class="reveal">
		<Buddy mood="celebrate" size={172} />
		<div class="item-reveal pop-in">
			<GoalItem kind={game.state.goal} size={140} />
		</div>
	</div>

	<p class="goal-praise">Your very own {GOAL_LABELS[game.state.goal]}, {buddyName(game.state)}!</p>

	<button type="button" class="btn btn-coral btn-huge" data-testid="goal-celebrate" onclick={() => actions.goalCelebrated()}>
		Hooray!
	</button>
</div>

<style>
	.reveal {
		position: relative;
		display: flex;
		align-items: flex-end;
		justify-content: center;
		gap: 4px;
		padding-right: 30px;
	}

	.item-reveal {
		margin-bottom: 46px;
		animation-delay: 0.25s;
	}

	.goal-praise {
		margin: 0;
		font-size: 21px;
		font-weight: 600;
		text-align: center;
	}
</style>

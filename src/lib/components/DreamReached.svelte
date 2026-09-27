<script lang="ts">
	import { TOY_PRICES } from '$lib/game/economy';
	import { actions, game } from '$lib/game/game.svelte';
	import { lines } from '$lib/game/lines';
	import { speak } from '$lib/game/speech';
	import { sounds } from '$lib/game/sounds';
	import Buddy from './Buddy.svelte';
	import Bubble from './Bubble.svelte';
	import GoalItem from './GoalItem.svelte';

	// Placeholder dream celebration (Task 5 replaces it). Plain visuals, real wiring.
	let spoke = $state(false);
	$effect(() => {
		if (spoke) return;
		spoke = true;
		speak(lines.dreamReached(game.state));
		sounds.chime();
	});
</script>

<div class="scene dream-reached">
	<Bubble tail="center">You saved {TOY_PRICES[game.state.goal]} coins!</Bubble>

	<div class="reveal">
		<Buddy mood="celebrate" size={172} />
		<div class="item-reveal pop-in">
			<GoalItem kind={game.state.goal} size={140} />
		</div>
	</div>

	<p class="dream-praise">{lines.dreamReached(game.state)}</p>

	<button
		type="button"
		class="btn btn-coral btn-huge"
		data-testid="dream-celebrate"
		onclick={() => actions.dreamCelebrated()}
	>
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
	}

	.dream-praise {
		margin: 0;
		font-size: 21px;
		font-weight: 600;
		text-align: center;
	}
</style>

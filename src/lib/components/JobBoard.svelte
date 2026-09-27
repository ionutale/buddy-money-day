<script lang="ts">
	import {
		FEED_REWARD,
		TIDY_REWARD,
		TIDY_TOYS,
		WATER_DROPS,
		WATER_REWARD
	} from '$lib/game/economy';
	import { actions, game } from '$lib/game/game.svelte';
	import { lines } from '$lib/game/lines';
	import { speak } from '$lib/game/speech';
	import { allChoresDone } from '$lib/game/state';
	import Bubble from './Bubble.svelte';
	import Coin from './Coin.svelte';

	// Placeholder board (Task 2 replaces it): three job cards, checkmarks,
	// and the cap line that unlocks the store. Plain visuals, real wiring.
	const done = $derived({
		tidy: game.state.tidyDone >= TIDY_TOYS,
		water: game.state.waterDone >= WATER_DROPS,
		feed: game.state.fedToday
	});
	const cap = $derived(allChoresDone(game.state));

	let spokePlan = $state(false);
	$effect(() => {
		if (spokePlan) return;
		spokePlan = true;
		speak(lines.planLine(game.state));
	});

	let spokeCap = $state(false);
	$effect(() => {
		if (!cap || spokeCap) return;
		spokeCap = true;
		speak(lines.cap(game.state));
	});
</script>

<div class="scene job-board" data-testid="job-board">
	<Bubble tail="center">{lines.planLine(game.state)}</Bubble>

	<div class="jobs">
		<button
			type="button"
			class="job-card"
			class:finished={done.tidy}
			data-testid="job-card-tidy"
			data-done={done.tidy ? 'true' : 'false'}
			disabled={done.tidy}
			onclick={() => actions.openTidy()}
		>
			<span class="job-name">Tidy the toys</span>
			<span class="job-pay"><Coin size={22} />{TIDY_REWARD}</span>
			{#if done.tidy}<span class="job-check" aria-hidden="true">✓</span>{/if}
		</button>

		<button
			type="button"
			class="job-card"
			class:finished={done.water}
			data-testid="job-card-water"
			data-done={done.water ? 'true' : 'false'}
			disabled={done.water}
			onclick={() => actions.openWater()}
		>
			<span class="job-name">Water the tree</span>
			<span class="job-pay"><Coin size={22} />{WATER_REWARD}</span>
			{#if done.water}<span class="job-check" aria-hidden="true">✓</span>{/if}
		</button>

		<button
			type="button"
			class="job-card"
			class:finished={done.feed}
			data-testid="job-card-feed"
			data-done={done.feed ? 'true' : 'false'}
			disabled={done.feed}
			onclick={() => actions.openFeed()}
		>
			<span class="job-name">Feed the bear</span>
			<span class="job-pay"><Coin size={22} />{FEED_REWARD}</span>
			{#if done.feed}<span class="job-check" aria-hidden="true">✓</span>{/if}
		</button>
	</div>

	{#if cap}
		<p class="cap-line" data-testid="cap-line">{lines.cap(game.state)}</p>
		<button
			type="button"
			class="btn btn-primary btn-huge"
			data-testid="to-store-button"
			onclick={() => actions.toStore()}
		>
			To the store!
		</button>
	{/if}
</div>

<style>
	.jobs {
		display: flex;
		gap: 12px;
		width: 100%;
		justify-content: center;
	}

	.job-card {
		position: relative;
		flex: 1;
		max-width: 156px;
		min-height: 172px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 10px;
		padding: 16px 8px;
		border: none;
		border-radius: 32px;
		background: #fffdf8;
		box-shadow: 0 7px 0 rgba(74, 55, 40, 0.12), 0 14px 26px rgba(74, 55, 40, 0.12);
		cursor: pointer;
	}

	.job-card:active {
		transform: translateY(5px);
	}

	.job-card.finished {
		filter: saturate(0.6);
		opacity: 0.75;
	}

	.job-name {
		font-size: 17px;
		font-weight: 600;
		color: var(--ink-soft);
		text-align: center;
	}

	.job-pay {
		display: inline-flex;
		align-items: center;
		gap: 2px;
		font-size: 22px;
		font-weight: 700;
	}

	.job-check {
		position: absolute;
		top: 8px;
		right: 12px;
		font-size: 30px;
		font-weight: 700;
		color: #6fb26f;
	}

	.cap-line {
		margin: 0;
		font-size: 21px;
		font-weight: 600;
		text-align: center;
	}
</style>

<script lang="ts">
	import { FEED_REWARD, TIDY_REWARD, WATER_REWARD } from '$lib/game/economy';
	import { actions, game } from '$lib/game/game.svelte';
	import { lines } from '$lib/game/lines';
	import { spoken } from '$lib/game/spoken';
	import { speakFragments } from '$lib/game/speech';
	import { allChoresDone, openFeed, openTidy, openWater } from '$lib/game/state';
	import Bubble from './Bubble.svelte';
	import Coin from './Coin.svelte';

	/**
	 * The day's hub: three jobs, any order, each once. The engine is the only
	 * completion truth — a card is checked when its door (`open*`) no longer
	 * opens (so a disabled card can never be a dead tap), and `allChoresDone`
	 * alone unlocks the cap line and the store door. The board keeps no
	 * parallel completion model of its own.
	 */
	const done = $derived({
		tidy: openTidy(game.state) === game.state,
		water: openWater(game.state) === game.state,
		feed: openFeed(game.state) === game.state
	});
	const cap = $derived(allChoresDone(game.state));

	// The plan line is already spoken in the greeting; the one line this scene
	// owns is the all-done payoff, spoken the moment it appears.
	let spokeCap = $state(false);
	$effect(() => {
		if (!cap || spokeCap) return;
		spokeCap = true;
		speakFragments(spoken.cap(game.state));
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
			<svg class="job-icon" viewBox="0 0 48 48" aria-hidden="true">
				<rect x="6" y="26" width="36" height="16" rx="6" fill="#d9a869" stroke="#4a3728" stroke-width="2.5" />
				<circle cx="18" cy="16" r="9" fill="#ff8a66" />
				<rect x="28" y="8" width="14" height="14" rx="4" fill="#ffd35c" stroke="#4a3728" stroke-width="2.5" />
			</svg>
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
			<svg class="job-icon" viewBox="0 0 40 52" aria-hidden="true">
				<path d="M20 3 C 29 20, 35 28, 35 36 a15 15 0 1 1 -30 0 C 5 28, 11 20, 20 3 Z" fill="#bfe3f5" stroke="#7cbcd9" stroke-width="3" />
			</svg>
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
			<svg class="job-icon" viewBox="0 0 48 48" aria-hidden="true">
				<path d="M5 20 Q24 14 43 20 L40 33 Q24 40 8 33 Z" fill="#ff8a66" stroke="#4a3728" stroke-width="2.5" stroke-linejoin="round" />
				<ellipse cx="24" cy="20" rx="19" ry="5" fill="#fffdf8" stroke="#4a3728" stroke-width="2.5" />
				<circle cx="17" cy="19" r="2.6" fill="#d9a869" />
				<circle cx="24" cy="18" r="2.6" fill="#d9a869" />
				<circle cx="31" cy="19" r="2.6" fill="#d9a869" />
			</svg>
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
		min-height: 196px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 6px;
		padding: 14px 8px;
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

	.job-icon {
		width: 62px;
		height: 62px;
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

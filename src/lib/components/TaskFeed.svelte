<script lang="ts">
	import { FEED_REWARD } from '$lib/game/economy';
	import { flyCoins, hudCoinPoint } from '$lib/game/flights.svelte';
	import { actions, game } from '$lib/game/game.svelte';
	import { lines } from '$lib/game/lines';
	import { speak } from '$lib/game/speech';
	import { sounds } from '$lib/game/sounds';
	import { toast } from '$lib/game/toasts.svelte';
	import Buddy from './Buddy.svelte';
	import Bubble from './Bubble.svelte';
	import Coin from './Coin.svelte';

	// Placeholder feed chore (Task 3 replaces it): one give action, no cost,
	// no skip, and the bear pays. Plain visuals, real wiring.
	let paying = $state(false);
	let bowlEl: SVGSVGElement | undefined = $state();
	let timer: ReturnType<typeof setTimeout> | undefined;

	let spoke = $state(false);
	$effect(() => {
		if (spoke) return;
		spoke = true;
		speak(lines.feed(game.state));
	});

	$effect(() => () => clearTimeout(timer));

	function give(): void {
		if (paying) return;
		paying = true;
		sounds.pop();
		speak(lines.feedPaid(game.state));
		toast(lines.feedPaid(game.state));
		const rect = bowlEl?.getBoundingClientRect();
		flyCoins({
			from: rect
				? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
				: { x: innerWidth / 2, y: innerHeight / 2 },
			to: hudCoinPoint(),
			count: FEED_REWARD
		});
		// Let the snack land, then the coin is paid and the hub returns.
		timer = setTimeout(() => actions.feedBear(), 1600);
	}
</script>

<div class="scene task-feed">
	<div class="task-head">
		<Bubble tail="center">{lines.feed(game.state)}</Bubble>
		<span class="price-tag" data-testid="price-tag-feed" aria-label="Pays {FEED_REWARD} coin">
			<Coin size={24} />{FEED_REWARD}
		</span>
	</div>

	<div class="buddy-bowl">
		<Buddy mood="hungry" size={180} />
		<svg class="bowl" bind:this={bowlEl} viewBox="0 0 160 90" role="img" aria-label="Buddy's food bowl">
			<path d="M14 34 Q80 22 146 34 L138 62 Q80 78 22 62 Z" fill="#ff8a66" stroke="#4a3728" stroke-width="4" stroke-linejoin="round" />
			<ellipse cx="80" cy="34" rx="66" ry="16" fill="#fffdf8" stroke="#4a3728" stroke-width="4" />
			<circle cx="62" cy="32" r="7" fill="#d9a869" />
			<circle cx="80" cy="28" r="7" fill="#d9a869" />
			<circle cx="98" cy="32" r="7" fill="#d9a869" />
		</svg>
	</div>

	<button
		type="button"
		class="btn btn-coral btn-huge"
		data-testid="feed-give"
		disabled={paying}
		onclick={give}
	>
		<Coin size={34} />
		Give the snack
	</button>
</div>

<style>
	.task-head {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.price-tag {
		display: inline-flex;
		align-items: center;
		gap: 3px;
		flex: 0 0 auto;
		background: #fffdf8;
		border-radius: 999px;
		padding: 6px 12px 6px 6px;
		font-size: 22px;
		font-weight: 700;
		box-shadow: 0 4px 0 rgba(74, 55, 40, 0.1);
	}

	.buddy-bowl {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.bowl {
		width: 180px;
		margin-top: -26px;
	}
</style>

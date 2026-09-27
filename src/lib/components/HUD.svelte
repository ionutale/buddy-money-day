<script lang="ts">
	import { TOY_PRICES } from '$lib/game/economy';
	import { game } from '$lib/game/game.svelte';
	import Coin from './Coin.svelte';
	import GoalBanner from './GoalBanner.svelte';

	type Props = {
		coins: number;
		jarCoins: number;
		day: number;
	};

	let { coins, jarCoins, day }: Props = $props();

	// The dream's price drives the progress readout — never a hardcoded literal.
	const dreamPrice = $derived(TOY_PRICES[game.state.goal]);
</script>

<!-- The in-day HUD: coins in hand, jar progress, which Money Day it is. -->
<header class="hud">
	<div class="hud-pill" aria-label="Coins in hand">
		<Coin size={36} />
		<span class="hud-number" data-testid="coin-count">{coins}</span>
	</div>

	<div class="hud-pill hud-save" aria-label="Coins in the Save Jar">
		<GoalBanner size={40} />
		<span class="hud-progress" data-testid="jar-progress">{jarCoins} / {dreamPrice}</span>
	</div>

	<div class="hud-pill hud-day" data-testid="day-badge">Day {day}</div>
</header>

<style>
	.hud {
		position: sticky;
		top: 0;
		z-index: 30;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		width: 100%;
		max-width: 560px;
		margin: 0 auto;
		padding: calc(8px + env(safe-area-inset-top, 0px)) 14px 8px;
	}

	.hud-pill {
		display: flex;
		align-items: center;
		gap: 7px;
		background: rgba(255, 253, 248, 0.94);
		border-radius: 999px;
		padding: 5px 15px 5px 8px;
		box-shadow: 0 4px 0 rgba(74, 55, 40, 0.08), 0 8px 18px rgba(74, 55, 40, 0.1);
		backdrop-filter: blur(6px);
		font-weight: 700;
		font-size: 22px;
	}

	.hud-number {
		min-width: 1.2em;
		text-align: center;
	}

	.hud-day {
		padding: 10px 16px;
		font-size: 18px;
		color: var(--ink-soft);
	}

	.hud-save {
		gap: 10px;
		padding: 5px 14px 5px 10px;
	}

	.hud-progress {
		min-width: 2.4em;
		text-align: right;
		font-size: 14px;
		color: var(--ink-soft);
	}
</style>

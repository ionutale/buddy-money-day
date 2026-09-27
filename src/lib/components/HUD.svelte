<script lang="ts">
	import { GOAL_COST } from '$lib/game/economy';
	import Coin from './Coin.svelte';
	import Jar from './Jar.svelte';

	type Props = {
		coins: number;
		jarCoins: number;
		day: number;
	};

	let { coins, jarCoins, day }: Props = $props();
</script>

<!-- The in-day HUD: coins in hand, jar progress, which Money Day it is. -->
<header class="hud">
	<div class="hud-pill" aria-label="Coins in hand">
		<Coin size={36} />
		<span class="hud-number" data-testid="coin-count">{coins}</span>
	</div>

	<div class="hud-pill" aria-label="Coins in the Save Jar">
		<Jar fill={jarCoins} capacity={GOAL_COST} size={42} />
		<span class="hud-number" data-testid="jar-progress">{jarCoins} / {GOAL_COST}</span>
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
</style>

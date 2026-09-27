<script lang="ts">
	import { FEED_REWARD, TIDY_REWARD, WATER_REWARD } from '$lib/game/economy';
	import { actions, game } from '$lib/game/game.svelte';
	import { lines } from '$lib/game/lines';
	import { speak } from '$lib/game/speech';
	import Buddy from './Buddy.svelte';
	import Bubble from './Bubble.svelte';
	import Coin from './Coin.svelte';

	let spoke = $state(false);
	$effect(() => {
		if (spoke) return;
		spoke = true;
		speak(lines.greetingPlan(game.state));
	});
</script>

<div class="scene greeting">
	<svg class="sun" width="74" height="74" viewBox="0 0 80 80" aria-hidden="true">
		<circle cx="40" cy="40" r="20" fill="#ffd35c" />
		<g stroke="#ffd35c" stroke-width="6" stroke-linecap="round">
			<path d="M40 4 v10" />
			<path d="M40 66 v10" />
			<path d="M4 40 h10" />
			<path d="M66 40 h10" />
			<path d="M15 15 l7 7" />
			<path d="M58 58 l7 7" />
			<path d="M65 15 l-7 7" />
			<path d="M22 58 l-7 7" />
		</g>
	</svg>

	<Bubble tail="left">{lines.greetingPlan(game.state)}</Bubble>

	<Buddy mood="happy" size={188} />

	<div class="plan" data-testid="plan-cards">
		<div class="plan-card" data-testid="plan-card-tidy">
			<svg class="plan-icon" viewBox="0 0 48 48" aria-hidden="true">
				<rect x="6" y="26" width="36" height="16" rx="6" fill="#d9a869" stroke="#4a3728" stroke-width="2.5" />
				<circle cx="18" cy="16" r="9" fill="#ff8a66" />
				<rect x="28" y="8" width="14" height="14" rx="4" fill="#ffd35c" stroke="#4a3728" stroke-width="2.5" />
			</svg>
			<span class="plan-price"><Coin size={22} />{TIDY_REWARD}</span>
		</div>
		<div class="plan-card" data-testid="plan-card-water">
			<svg class="plan-icon" viewBox="0 0 40 52" aria-hidden="true">
				<path d="M20 3 C 29 20, 35 28, 35 36 a15 15 0 1 1 -30 0 C 5 28, 11 20, 20 3 Z" fill="#bfe3f5" stroke="#7cbcd9" stroke-width="3" />
			</svg>
			<span class="plan-price"><Coin size={22} />{WATER_REWARD}</span>
		</div>
		<div class="plan-card" data-testid="plan-card-feed">
			<svg class="plan-icon" viewBox="0 0 48 48" aria-hidden="true">
				<path d="M5 20 Q24 14 43 20 L40 33 Q24 40 8 33 Z" fill="#ff8a66" stroke="#4a3728" stroke-width="2.5" stroke-linejoin="round" />
				<ellipse cx="24" cy="20" rx="19" ry="5" fill="#fffdf8" stroke="#4a3728" stroke-width="2.5" />
				<circle cx="17" cy="19" r="2.6" fill="#d9a869" />
				<circle cx="24" cy="18" r="2.6" fill="#d9a869" />
				<circle cx="31" cy="19" r="2.6" fill="#d9a869" />
			</svg>
			<span class="plan-price"><Coin size={22} />{FEED_REWARD}</span>
		</div>
	</div>

	<button type="button" class="btn btn-primary btn-huge" data-testid="greeting-start" onclick={() => actions.greetDone()}>
		Let's help Buddy!
		<svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true">
			<path d="M6 16 h16 M16 8 l9 8 -9 8" fill="none" stroke="#4a3728" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
		</svg>
	</button>
</div>

<style>
	.greeting {
		position: relative;
	}

	.sun {
		position: absolute;
		top: -6px;
		left: 2px;
		animation: sun-turn 24s linear infinite;
	}

	@keyframes sun-turn {
		to {
			transform: rotate(360deg);
		}
	}

	.plan {
		display: flex;
		gap: 12px;
	}

	.plan-card {
		display: flex;
		align-items: center;
		gap: 8px;
		background: #fffdf8;
		border-radius: 22px;
		padding: 8px 14px;
		box-shadow: 0 5px 0 rgba(74, 55, 40, 0.1);
	}

	.plan-icon {
		width: 40px;
		height: 40px;
	}

	.plan-price {
		display: inline-flex;
		align-items: center;
		gap: 2px;
		font-size: 22px;
		font-weight: 700;
	}
</style>

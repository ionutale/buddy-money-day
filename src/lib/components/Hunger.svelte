<script lang="ts">
	import { FEED_COST } from '$lib/game/economy';
	import { flyCoins, hudCoinPoint } from '$lib/game/flights.svelte';
	import { actions, game } from '$lib/game/game.svelte';
	import { lines } from '$lib/game/lines';
	import { speak } from '$lib/game/speech';
	import { sounds } from '$lib/game/sounds';
	import { toast } from '$lib/game/toasts.svelte';
	import Buddy from './Buddy.svelte';
	import Bubble from './Bubble.svelte';
	import Coin from './Coin.svelte';

	let feeding = $state(false);
	let denied = $state(false);
	let bowlEl: SVGSVGElement | undefined = $state();
	let timer: ReturnType<typeof setTimeout> | undefined;

	let spoke = $state(false);
	$effect(() => {
		if (spoke) return;
		spoke = true;
		speak(lines.hunger(game.state));
	});

	$effect(() => () => clearTimeout(timer));

	function feed(): void {
		if (feeding) return;
		if (game.state.coins < FEED_COST) {
			sounds.sad();
			speak(lines.hungerNoCoin(game.state));
			denied = true;
			timer = setTimeout(() => (denied = false), 700);
			return;
		}
		feeding = true;
		sounds.pop();
		// Munch, then pay the coin visibly and say where the goal stands,
		// then the day moves on.
		timer = setTimeout(() => {
			speak(lines.hungerSpent(game.state));
			toast(lines.hungerSpent(game.state));
			const rect = bowlEl?.getBoundingClientRect();
			flyCoins({
				from: hudCoinPoint(),
				to: rect
					? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
					: { x: innerWidth / 2, y: innerHeight / 2 },
				count: FEED_COST
			});
			timer = setTimeout(() => actions.feedBuddy(), 1400);
		}, 850);
	}
</script>

<div class="scene hunger">
	<Bubble tail="center">{lines.hunger(game.state)}</Bubble>

	<div class="buddy-bowl" class:feeding class:wobble={denied}>
		<Buddy mood="hungry" size={180} />
		<svg class="bowl" bind:this={bowlEl} viewBox="0 0 160 90" role="img" aria-label="Buddy's food bowl">
			<path d="M14 34 Q80 22 146 34 L138 62 Q80 78 22 62 Z" fill="#ff8a66" stroke="#4a3728" stroke-width="4" stroke-linejoin="round" />
			<ellipse cx="80" cy="34" rx="66" ry="16" fill="#fffdf8" stroke="#4a3728" stroke-width="4" />
			{#if feeding}
				<ellipse cx="80" cy="34" rx="50" ry="10" fill="#ffd35c" opacity="0.9" />
			{:else}
				<circle cx="62" cy="32" r="7" fill="#d9a869" />
				<circle cx="80" cy="28" r="7" fill="#d9a869" />
				<circle cx="98" cy="32" r="7" fill="#d9a869" />
			{/if}
		</svg>
	</div>

	<div class="hunger-actions">
		<button type="button" class="btn btn-coral btn-huge" data-testid="hunger-feed" disabled={feeding} onclick={feed}>
			<Coin size={34} />
			Feed Buddy
		</button>
		<button type="button" class="btn btn-ghost" data-testid="hunger-skip" disabled={feeding} onclick={() => actions.skipFeed()}>
			Later
		</button>
	</div>
</div>

<style>
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

	.buddy-bowl.feeding .bowl {
		animation: bowl-hop 0.4s ease-in-out infinite;
	}

	.buddy-bowl.wobble {
		animation: bowl-wobble 0.5s ease-in-out;
	}

	@keyframes bowl-hop {
		50% {
			transform: translateY(-5px) scale(1.03);
		}
	}

	@keyframes bowl-wobble {
		25% {
			transform: translateX(-8px) rotate(-2deg);
		}
		75% {
			transform: translateX(8px) rotate(2deg);
		}
	}

	.hunger-actions {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
		width: 100%;
	}
</style>

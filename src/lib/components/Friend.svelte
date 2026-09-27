<script lang="ts">
	import { SWING_PLANKS } from '$lib/game/economy';
	import { actions, game } from '$lib/game/game.svelte';
	import { lines } from '$lib/game/lines';
	import { speak } from '$lib/game/speech';
	import { sounds } from '$lib/game/sounds';
	import Bubble from './Bubble.svelte';
	import Coin from './Coin.svelte';

	let hop = $state(0);
	let denied = $state(false);
	let timer: ReturnType<typeof setTimeout> | undefined;

	let canGive = $derived(
		game.state.coins >= 1 && game.state.planks < SWING_PLANKS && game.state.gaveToday < SWING_PLANKS
	);

	let spoke = $state(false);
	$effect(() => {
		if (spoke) return;
		spoke = true;
		speak(lines.friend(game.state));
	});

	$effect(() => () => clearTimeout(timer));

	function give(): void {
		if (!canGive) {
			sounds.sad();
			denied = true;
			timer = setTimeout(() => (denied = false), 600);
			return;
		}
		actions.giveCoin();
		sounds.coin();
		hop += 1;
		speak(lines.friendGive(game.state));
	}
</script>

<div class="scene friend">
	<Bubble tail="left">The bird's swing is broken!</Bubble>

	<div class="swing-zone" class:wobble={denied}>
		<svg class="swing" viewBox="0 0 260 224" role="img" aria-label="The bird's swing">
			<!-- frame -->
			<path d="M40 206 L70 40" stroke="#b9834f" stroke-width="12" stroke-linecap="round" />
			<path d="M220 206 L190 40" stroke="#b9834f" stroke-width="12" stroke-linecap="round" />
			<path d="M64 40 L196 40" stroke="#b9834f" stroke-width="12" stroke-linecap="round" />
			<path d="M28 206 L232 206" stroke="#b9834f" stroke-width="12" stroke-linecap="round" />
			<!-- ropes -->
			<path d="M96 40 L96 130" stroke="#d9a869" stroke-width="4" stroke-linecap="round" />
			<path d="M164 40 L164 130" stroke="#d9a869" stroke-width="4" stroke-linecap="round" />
			<!-- seat planks -->
			{#each [0, 1, 2] as i (i)}
				{#if i < game.state.planks}
					<rect x="80" y={128 + i * 10} width="100" height="9" rx="4.5" fill="#d9a869" stroke="#4a3728" stroke-width="2.5" />
				{:else}
					<rect x="80" y={128 + i * 10} width="100" height="9" rx="4.5" fill="none" stroke="#4a3728" stroke-width="2" stroke-dasharray="6 7" opacity="0.28" />
				{/if}
			{/each}
			<!-- bird -->
			{#key hop}
				<g class="bird hop">
					<ellipse cx="130" cy="96" rx="20" ry="17" fill="#bfe3f5" stroke="#4a3728" stroke-width="3" />
					<ellipse cx="134" cy="102" rx="10" ry="8" fill="#e8f6ff" />
					<ellipse class="wing" cx="118" cy="96" rx="8" ry="12" fill="#7cbcd9" transform="rotate(18 118 96)" />
					<circle cx="140" cy="90" r="3.4" fill="#4a3728" />
					<path d="M148 94 l10 4 -10 4 z" fill="#ffd35c" stroke="#4a3728" stroke-width="2" stroke-linejoin="round" />
					<path d="M124 112 l0 8 M136 112 l0 8" stroke="#4a3728" stroke-width="3" stroke-linecap="round" />
				</g>
			{/key}
		</svg>

		<p class="swing-count" data-testid="swing-planks">{game.state.planks} / {SWING_PLANKS}</p>
	</div>

	<div class="friend-actions">
		<button
			type="button"
			class="btn btn-mint btn-huge"
			class:btn-dim={!canGive}
			data-testid="friend-give"
			onclick={give}
		>
			<Coin size={34} />
			Give a coin
		</button>
		<button type="button" class="btn btn-primary" data-testid="friend-done" onclick={() => actions.friendDone()}>
			All done
		</button>
	</div>
</div>

<style>
	.swing-zone {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.swing-zone.wobble {
		animation: bowl-wobble 0.5s ease-in-out;
	}

	@keyframes bowl-wobble {
		25% {
			transform: translateX(-8px) rotate(-1.5deg);
		}
		75% {
			transform: translateX(8px) rotate(1.5deg);
		}
	}

	.swing {
		width: min(340px, 88vw);
		height: auto;
	}

	.bird.hop {
		transform-box: fill-box;
		transform-origin: center bottom;
		animation: bird-hop 0.55s cubic-bezier(0.3, 1.6, 0.4, 1);
	}

	@keyframes bird-hop {
		40% {
			transform: translateY(-18px) rotate(-6deg);
		}
		70% {
			transform: translateY(0) rotate(0);
		}
	}

	.swing-count {
		margin: -8px 0 0;
		font-size: 24px;
		font-weight: 700;
		color: var(--ink-soft);
	}

	.friend-actions {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
		width: 100%;
	}
</style>

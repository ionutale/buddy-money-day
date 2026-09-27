<script lang="ts">
	import { TOY_LABELS, TOY_PRICES } from '$lib/game/economy';
	import { banner } from '$lib/game/banner.svelte';
	import { game } from '$lib/game/game.svelte';
	import GoalItem from './GoalItem.svelte';

	type Props = { size?: number };
	let { size = 42 }: Props = $props();

	// The slots show what the jar holds — unless a scene previews an outcome
	// (the Store previews what saving the held coins would accomplish).
	// The slot count is the dream's price, never a hardcoded literal.
	const price = $derived(TOY_PRICES[game.state.goal]);
	const filled = $derived(Math.min(banner.preview ?? game.state.jarCoins, price));
</script>

<div
	class="goal-banner"
	data-testid="goal-banner"
	aria-label="Saving for your {TOY_LABELS[game.state.goal]}"
>
	<GoalItem kind={game.state.goal} size={size} />
	<span class="slots" aria-hidden="true">
		{#each Array(price) as _, index (index)}
			<span
				class="slot"
				class:full={index < filled}
				data-testid="goal-slot-{index}"
				data-filled={index < filled ? 'true' : 'false'}
			></span>
		{/each}
	</span>
</div>

<style>
	.goal-banner {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.slots {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
		max-width: 104px;
	}

	.slot {
		width: 13px;
		height: 13px;
		border-radius: 50%;
		background: #fffdf8;
		box-shadow: inset 0 0 0 2.5px rgba(74, 55, 40, 0.22);
		transition:
			background 0.25s ease,
			box-shadow 0.25s ease;
	}

	.slot.full {
		background: #ffd35c;
		box-shadow:
			inset 0 0 0 2.5px rgba(74, 55, 40, 0.3),
			0 0 6px rgba(255, 211, 92, 0.8);
		animation: slot-pop 0.35s cubic-bezier(0.2, 1.5, 0.4, 1) both;
	}

	@keyframes slot-pop {
		40% {
			translate: 0 -4px;
			scale: 1.25;
		}
	}
</style>

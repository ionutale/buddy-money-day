<script lang="ts">
	import { TOY_LABELS, TOY_PRICES } from '$lib/game/economy';
	import { banner } from '$lib/game/banner.svelte';
	import { game } from '$lib/game/game.svelte';
	import GoalItem from './GoalItem.svelte';

	type Props = {
		size?: number;
		/** A tight 6-per-row layout for the narrow in-day HUD. */
		compact?: boolean;
	};
	let { size = 42, compact = false }: Props = $props();

	// The slots show what the jar holds — unless a scene previews an outcome
	// (the Store previews what saving the held coins would accomplish).
	// The slot count is the dream's price, never a hardcoded literal.
	const price = $derived(TOY_PRICES[game.state.goal]);
	const filled = $derived(Math.min(banner.preview ?? game.state.jarCoins, price));
</script>

<div
	class="goal-banner"
	class:compact
	data-testid="goal-banner"
	aria-label="Saving for your {TOY_LABELS[game.state.goal]}"
>
	<GoalItem kind={game.state.goal} size={size} />
	<span class="slots" class:compact aria-hidden="true">
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

	.goal-banner.compact {
		gap: 6px;
	}

	.slots {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
		max-width: 104px;
	}

	/*
	 * The in-day HUD has no room for the full-size slots at phone widths;
	 * a fixed six-column grid holds two clean rows of six instead of the
	 * 5/5/2 rag the flex wrap produced (and the columns may shrink a little
	 * on the narrowest phones rather than overflow).
	 */
	.slots.compact {
		display: grid;
		grid-template-columns: repeat(6, minmax(8px, 11px));
		grid-auto-rows: 11px;
		gap: 2px;
		max-width: none;
	}

	.slots.compact .slot {
		width: auto;
		height: 11px;
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

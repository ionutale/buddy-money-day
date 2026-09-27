<script lang="ts">
	import { TOY_LABELS, type ToyId } from '$lib/game/economy';
	import GoalItem from './GoalItem.svelte';

	type Props = {
		items: ToyId[];
		size?: number;
	};

	let { items, size = 58 }: Props = $props();
</script>

<!--
	The toys a child owns, in acquisition order: bought toys and completed
	dreams. Shared by the title screen and the dream celebration (where the
	dreaming toy previews its landing place).
-->
<section class="owned-strip" data-testid="owned-strip" aria-label="My Toys">
	<div class="owned-rug">
		{#each items as id}
			<div class="owned-slot pop-in" data-testid="owned-toy-{id}" aria-label={TOY_LABELS[id]}>
				<GoalItem kind={id} size={size} />
			</div>
		{:else}
			<div class="owned-slot empty" aria-hidden="true">
				<span class="owned-dot"></span>
			</div>
		{/each}
	</div>
</section>

<style>
	.owned-strip {
		display: flex;
		flex-direction: column;
		align-items: center;
		width: 100%;
	}

	.owned-rug {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 10px;
		max-width: 100%;
		padding: 8px 12px;
		background: linear-gradient(180deg, rgba(255, 253, 248, 0.7), rgba(255, 253, 248, 0.96));
		border-radius: 28px;
		box-shadow: inset 0 -6px 0 rgba(74, 55, 40, 0.12), 0 10px 22px rgba(74, 55, 40, 0.12);
	}

	.owned-slot {
		width: 62px;
		height: 62px;
		border-radius: 22px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.owned-slot:not(.empty) {
		background: #fffdf8;
		box-shadow: 0 4px 0 rgba(74, 55, 40, 0.1);
	}

	.owned-slot.empty {
		border: 3px dashed rgba(74, 55, 40, 0.2);
	}

	.owned-dot {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: rgba(74, 55, 40, 0.14);
	}
</style>

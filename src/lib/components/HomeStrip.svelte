<script lang="ts">
	import { GOALS, GOAL_LABELS, type GoalId } from '$lib/game/economy';
	import GoalItem from './GoalItem.svelte';

	type Props = {
		items: GoalId[];
	};

	let { items }: Props = $props();
</script>

<!--
	Buddy's Home: the whole progression system. Earned Goals live here as
	real objects; empty slots stay visible so there is always something next.
-->
<section class="home-strip" data-testid="home-strip" aria-label="Buddy's Home">
	<p class="home-label">Buddy's Home</p>
	<div class="home-shelf">
		{#each GOALS as id (id)}
			{#if items.includes(id)}
				<div class="home-slot earned pop-in" data-testid="home-item-{id}" aria-label={GOAL_LABELS[id]}>
					<GoalItem kind={id} size={62} />
				</div>
			{:else}
				<div class="home-slot empty" aria-hidden="true">
					<span class="home-dot"></span>
				</div>
			{/if}
		{/each}
	</div>
</section>

<style>
	.home-strip {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		width: 100%;
	}

	.home-label {
		margin: 0;
		font-size: 16px;
		font-weight: 600;
		color: var(--ink-soft);
		letter-spacing: 0.4px;
	}

	.home-shelf {
		display: flex;
		gap: 12px;
		padding: 12px 16px 16px;
		background: linear-gradient(180deg, rgba(255, 253, 248, 0.7), rgba(255, 253, 248, 0.96));
		border-radius: 32px;
		box-shadow: inset 0 -7px 0 rgba(74, 55, 40, 0.12), 0 12px 28px rgba(74, 55, 40, 0.12);
	}

	.home-slot {
		width: 80px;
		height: 80px;
		border-radius: 26px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.home-slot.earned {
		background: #fffdf8;
		box-shadow: 0 4px 0 rgba(74, 55, 40, 0.1);
	}

	.home-slot.empty {
		border: 3px dashed rgba(74, 55, 40, 0.2);
	}

	.home-dot {
		width: 14px;
		height: 14px;
		border-radius: 50%;
		background: rgba(74, 55, 40, 0.14);
	}
</style>

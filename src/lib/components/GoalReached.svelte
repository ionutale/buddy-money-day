<script lang="ts">
	import { GOAL_LABELS } from '$lib/game/economy';
	import { actions, game } from '$lib/game/game.svelte';
	import { buddyName, lines } from '$lib/game/lines';
	import { speak } from '$lib/game/speech';
	import { sounds } from '$lib/game/sounds';
	import Buddy from './Buddy.svelte';
	import Bubble from './Bubble.svelte';
	import GoalItem from './GoalItem.svelte';
	import HomeStrip from './HomeStrip.svelte';

	let revealEl: HTMLDivElement | undefined = $state();
	let homeEl: HTMLDivElement | undefined = $state();
	let arc = $state<{ x: number; y: number; dx: number; dy: number } | null>(null);
	let timer: ReturnType<typeof setTimeout> | undefined;

	let spoke = $state(false);
	$effect(() => {
		if (spoke) return;
		spoke = true;
		speak(lines.goalReached(game.state));
		sounds.chime();
		// The item arcs from the reveal into its place in Home.
		timer = setTimeout(() => {
			const from = revealEl?.getBoundingClientRect();
			const to = homeEl?.getBoundingClientRect();
			if (!from || !to) return;
			arc = {
				x: from.left + from.width / 2,
				y: from.top + from.height / 2,
				dx: to.left + to.width / 2 - (from.left + from.width / 2),
				dy: to.top + to.height / 2 - (from.top + from.height / 2)
			};
			timer = setTimeout(() => (arc = null), 950);
		}, 650);
	});

	$effect(() => () => clearTimeout(timer));
</script>

<div class="scene goal-reached">
	<Bubble tail="center">You saved six coins!</Bubble>

	<div class="reveal">
		<Buddy mood="celebrate" size={172} />
		<div class="item-reveal pop-in" bind:this={revealEl}>
			<GoalItem kind={game.state.goal} size={140} />
		</div>
	</div>

	<p class="goal-praise">Your very own {GOAL_LABELS[game.state.goal]}, {buddyName(game.state)}!</p>

	<!-- The finished item takes its place on the shelf — the preview of Home. -->
	<div class="home-target" bind:this={homeEl}>
		<HomeStrip items={[...game.state.homeItems, game.state.goal]} />
	</div>

	<button type="button" class="btn btn-coral btn-huge" data-testid="goal-celebrate" onclick={() => actions.goalCelebrated()}>
		Hooray!
	</button>
</div>

{#if arc}
	<span
		class="arc-item"
		aria-hidden="true"
		style="left: {arc.x}px; top: {arc.y}px; --dx: {arc.dx}px; --dy: {arc.dy}px"
	>
		<GoalItem kind={game.state.goal} size={96} />
	</span>
{/if}

<style>
	.reveal {
		position: relative;
		display: flex;
		align-items: flex-end;
		justify-content: center;
		gap: 4px;
		padding-right: 30px;
	}

	.item-reveal {
		margin-bottom: 46px;
		animation-delay: 0.25s;
	}

	.goal-praise {
		margin: 0;
		font-size: 21px;
		font-weight: 600;
		text-align: center;
	}

	.home-target {
		width: 100%;
		display: flex;
		justify-content: center;
	}

	.arc-item {
		position: fixed;
		z-index: 92;
		pointer-events: none;
		animation: item-arc 0.95s cubic-bezier(0.35, 0.6, 0.4, 1) both;
	}

	@keyframes item-arc {
		0% {
			translate: -50% -50%;
			scale: 1;
		}
		55% {
			translate: calc(-50% + var(--dx) * 0.5) calc(-50% + var(--dy) * 0.35 - 70px);
			scale: 0.9;
		}
		100% {
			translate: calc(-50% + var(--dx)) calc(-50% + var(--dy));
			scale: 0.55;
			opacity: 0.85;
		}
	}
</style>

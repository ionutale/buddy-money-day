<script lang="ts">
	import { TOY_PRICES } from '$lib/game/economy';
	import { actions, game } from '$lib/game/game.svelte';
	import { lines } from '$lib/game/lines';
	import { speak } from '$lib/game/speech';
	import { sounds } from '$lib/game/sounds';
	import Buddy from './Buddy.svelte';
	import Bubble from './Bubble.svelte';
	import GoalItem from './GoalItem.svelte';
	import OwnedStrip from './OwnedStrip.svelte';

	// The celebration: the dream is reached, then the item arcs from the
	// reveal into its place on the strip — the child sees it come home.
	let revealEl: HTMLDivElement | undefined = $state();
	let stripEl: HTMLDivElement | undefined = $state();
	let arc = $state<{ x: number; y: number; dx: number; dy: number } | null>(null);
	let timer: ReturnType<typeof setTimeout> | undefined;

	let spoke = $state(false);
	$effect(() => {
		if (spoke) return;
		spoke = true;
		speak(lines.dreamReached(game.state));
		sounds.chime();
		// The item arcs from the reveal into its place on the strip.
		timer = setTimeout(() => {
			const from = revealEl?.getBoundingClientRect();
			// The acquired toy's own slot — the last one on the strip, since the
			// push happens on Hooray. Once the strip wraps rows, the wrapper's
			// centre is a gap, so fall back to it only when the slot is missing.
			const slot = stripEl?.querySelector(`[data-index="${game.state.owned.length}"]`);
			const to = slot?.getBoundingClientRect() ?? stripEl?.getBoundingClientRect();
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

<div class="scene dream-reached">
	<Bubble tail="center">You saved {TOY_PRICES[game.state.goal]} coins!</Bubble>

	<div class="reveal">
		<Buddy mood="celebrate" size={172} />
		<div class="item-reveal pop-in" bind:this={revealEl}>
			<GoalItem kind={game.state.goal} size={140} />
		</div>
	</div>

	<p class="dream-praise">{lines.dreamReached(game.state)}</p>

	<!-- The dream takes its place with the toys — the preview of My Toys. -->
	<div class="strip-target" bind:this={stripEl}>
		<OwnedStrip items={[...game.state.owned, game.state.goal]} />
	</div>

	<button
		type="button"
		class="btn btn-coral btn-huge"
		data-testid="dream-celebrate"
		onclick={() => actions.dreamCelebrated()}
	>
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

	.dream-praise {
		margin: 0;
		font-size: 21px;
		font-weight: 600;
		text-align: center;
	}

	.strip-target {
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

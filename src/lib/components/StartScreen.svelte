<script lang="ts">
	import { actions, game } from '$lib/game/game.svelte';
	import { lines } from '$lib/game/lines';
	import { speak } from '$lib/game/speech';
	import { unlock } from '$lib/game/sounds';
	import Buddy from './Buddy.svelte';
	import GoalBanner from './GoalBanner.svelte';
	import OwnedStrip from './OwnedStrip.svelte';
	import Setup from './Setup.svelte';

	let showSetup = $state(false);

	let spoke = $state(false);
	$effect(() => {
		if (spoke) return;
		spoke = true;
		speak(lines.start(game.state));
	});

	function play(): void {
		// The first tap unlocks WebAudio for the whole day.
		unlock();
		actions.beginDay();
	}
</script>

<div class="scene start-screen">
	<button
		type="button"
		class="gear"
		data-testid="open-setup-button"
		aria-label="Grown-up setup"
		onclick={() => (showSetup = true)}
	>
		<svg width="36" height="36" viewBox="0 0 48 48" aria-hidden="true">
			<circle cx="24" cy="24" r="10" fill="none" stroke="#4a3728" stroke-width="5.5" opacity="0.75" />
			<g stroke="#4a3728" stroke-width="5.5" stroke-linecap="round" opacity="0.75">
				<path d="M24 4.5 v6" />
				<path d="M24 37.5 v6" />
				<path d="M4.5 24 h6" />
				<path d="M37.5 24 h6" />
				<path d="M10.5 10.5 l4.3 4.3" />
				<path d="M33.2 33.2 l4.3 4.3" />
				<path d="M37.5 10.5 l-4.3 4.3" />
				<path d="M14.8 33.2 l-4.3 4.3" />
			</g>
		</svg>
	</button>

	<div class="start-day chip">Day {game.state.day}</div>

	<h1 class="game-title">Buddy's <span>Money Day</span></h1>

	<div class="start-buddy">
		<Buddy mood="happy" size={208} />
	</div>

	<button type="button" class="btn btn-primary btn-huge" data-testid="start-button" onclick={play}>
		<svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true">
			<path d="M8 5 L28 16 L8 27 Z" fill="#4a3728" />
		</svg>
		Let's play!
	</button>

	<GoalBanner size={52} />

	<OwnedStrip items={game.state.owned} />

	<button type="button" class="btn btn-mint" data-testid="toys-door">
		<svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
			<circle cx="8" cy="9" r="4.5" fill="#d9a869" stroke="#4a3728" stroke-width="1.6" />
			<circle cx="24" cy="9" r="4.5" fill="#d9a869" stroke="#4a3728" stroke-width="1.6" />
			<circle cx="16" cy="18" r="10" fill="#d9a869" stroke="#4a3728" stroke-width="1.6" />
			<ellipse cx="16" cy="21.5" rx="5" ry="3.8" fill="#f4dcc0" />
			<circle cx="12.5" cy="15.5" r="1.7" fill="#4a3728" />
			<circle cx="19.5" cy="15.5" r="1.7" fill="#4a3728" />
			<ellipse cx="16" cy="19.5" rx="2" ry="1.4" fill="#4a3728" />
		</svg>
		My Toys
	</button>

	{#if showSetup}
		<Setup mode="reset" onclose={() => (showSetup = false)} />
	{/if}
</div>

<style>
	.start-screen {
		position: relative;
		padding-top: 26px;
	}

	.gear {
		position: absolute;
		top: 0;
		right: 0;
		width: 62px;
		height: 62px;
		border: none;
		border-radius: 50%;
		background: rgba(255, 253, 248, 0.85);
		box-shadow: 0 4px 0 rgba(74, 55, 40, 0.1);
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		opacity: 0.7;
	}

	.gear:focus-visible {
		outline: 4px solid var(--sky);
		outline-offset: 2px;
	}

	.start-day {
		align-self: flex-start;
		font-size: 17px;
		color: var(--ink-soft);
	}

	.game-title {
		margin: 0;
		text-align: center;
		font-size: clamp(40px, 12vw, 58px);
		line-height: 0.98;
		font-weight: 700;
		letter-spacing: -0.5px;
		text-shadow: 0 5px 0 rgba(255, 211, 92, 0.55);
		animation: title-pop 0.7s cubic-bezier(0.2, 1.5, 0.4, 1) both;
	}

	.game-title span {
		color: var(--coral);
	}

	@keyframes title-pop {
		from {
			opacity: 0;
			transform: translateY(18px) scale(0.9);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}

	.start-buddy {
		filter: drop-shadow(0 16px 22px rgba(74, 55, 40, 0.16));
	}
</style>

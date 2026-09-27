<script lang="ts">
	import { actions, game } from '$lib/game/game.svelte';
	import { buddyName, lines } from '$lib/game/lines';
	import { speak } from '$lib/game/speech';
	import { sounds } from '$lib/game/sounds';
	import Buddy from './Buddy.svelte';

	let sad = $derived(game.state.buddySad || !game.state.fedToday);

	let spoke = $state(false);
	$effect(() => {
		if (spoke) return;
		spoke = true;
		speak(sad ? lines.tuckInSad(game.state) : lines.tuckInHappy(game.state));
		if (sad) sounds.sad();
	});
</script>

<div class="scene tuck-in">
	<svg class="window" width="132" height="112" viewBox="0 0 132 112" aria-hidden="true">
		<rect x="4" y="4" width="124" height="104" rx="22" fill="#bfe3f5" stroke="#4a3728" stroke-width="4" />
		<path d="M96 30 a20 20 0 1 0 12 32 a24 24 0 0 1 -12 -32" fill="#ffe9a8" />
		<circle cx="30" cy="30" r="4.5" fill="#fffdf8" />
		<circle cx="52" cy="20" r="3.5" fill="#fffdf8" />
		<circle cx="34" cy="62" r="3.5" fill="#fffdf8" />
		<circle cx="112" cy="86" r="3.5" fill="#fffdf8" />
		<path d="M6 4 h120" stroke="#4a3728" stroke-width="4" />
	</svg>

	<div class="bed">
		<div class="headboard"></div>
		<div class="buddy-in-bed" class:rumble={sad}>
			<Buddy mood={sad ? 'sad' : 'sleepy'} size={152} />
		</div>
		<div class="blanket"></div>
	</div>

	<p class="good-night">
		{#if sad}
			Buddy's tummy is rumbling. We can feed Buddy tomorrow.
		{:else}
			Good night, {buddyName(game.state)}!
		{/if}
	</p>

	<button type="button" class="btn btn-primary btn-huge" data-testid="tuckin-done" onclick={() => actions.tuckInDone()}>
		<svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true">
			<path d="M22 4 a13 13 0 1 0 6 22 a11 11 0 0 1 -6 -22" fill="#ffd35c" stroke="#4a3728" stroke-width="2.5" stroke-linejoin="round" />
		</svg>
		Good night
	</button>
</div>

<style>
	.window {
		animation: window-glow 5s ease-in-out infinite;
	}

	@keyframes window-glow {
		50% {
			filter: brightness(1.06);
		}
	}

	.bed {
		position: relative;
		width: min(360px, 90vw);
		height: 230px;
		margin-top: 4px;
	}

	.headboard {
		position: absolute;
		left: 0;
		top: 0;
		bottom: 0;
		width: 30px;
		border-radius: 22px 8px 8px 22px;
		background: linear-gradient(180deg, #d9a869, #c08b4f);
	}

	.buddy-in-bed {
		position: absolute;
		left: 40px;
		bottom: 74px;
	}

	.buddy-in-bed.rumble {
		animation: bed-rumble 2.2s ease-in-out infinite;
	}

	@keyframes bed-rumble {
		0%,
		100% {
			translate: 0 0;
		}
		50% {
			translate: 0 -3px;
		}
	}

	.blanket {
		position: absolute;
		left: 12px;
		right: 0;
		bottom: 0;
		height: 118px;
		border-radius: 30px 30px 18px 18px;
		background: linear-gradient(180deg, #8ed4c0, #6fb8a4);
		box-shadow: inset 0 8px 0 rgba(255, 255, 255, 0.25), 0 -6px 0 rgba(74, 55, 40, 0.06);
	}

	.blanket::after {
		content: '';
		position: absolute;
		inset: 16px;
		border-radius: 22px;
		background-image: radial-gradient(rgba(255, 253, 248, 0.55) 4px, transparent 4.5px);
		background-size: 26px 26px;
	}

	.good-night {
		margin: 0;
		font-size: 20px;
		font-weight: 600;
		text-align: center;
		color: var(--ink-soft);
	}
</style>

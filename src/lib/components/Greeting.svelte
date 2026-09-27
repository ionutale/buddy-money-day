<script lang="ts">
	import { actions, game } from '$lib/game/game.svelte';
	import { lines } from '$lib/game/lines';
	import { speak } from '$lib/game/speech';
	import Buddy from './Buddy.svelte';
	import Bubble from './Bubble.svelte';

	// The greeting owns the day's spoken plan; the job cards themselves live
	// on the board, so nothing here repeats them.
	let spoke = $state(false);
	$effect(() => {
		if (spoke) return;
		spoke = true;
		speak(lines.greetingPlan(game.state));
	});
</script>

<div class="scene greeting">
	<svg class="sun" width="74" height="74" viewBox="0 0 80 80" aria-hidden="true">
		<circle cx="40" cy="40" r="20" fill="#ffd35c" />
		<g stroke="#ffd35c" stroke-width="6" stroke-linecap="round">
			<path d="M40 4 v10" />
			<path d="M40 66 v10" />
			<path d="M4 40 h10" />
			<path d="M66 40 h10" />
			<path d="M15 15 l7 7" />
			<path d="M58 58 l7 7" />
			<path d="M65 15 l-7 7" />
			<path d="M22 58 l-7 7" />
		</g>
	</svg>

	<Bubble tail="left">{lines.greetingPlan(game.state)}</Bubble>

	<Buddy mood="happy" size={188} />

	<button type="button" class="btn btn-primary btn-huge" data-testid="greeting-start" onclick={() => actions.greetDone()}>
		Let's help Buddy!
		<svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true">
			<path d="M6 16 h16 M16 8 l9 8 -9 8" fill="none" stroke="#4a3728" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
		</svg>
	</button>
</div>

<style>
	.greeting {
		position: relative;
	}

	.sun {
		position: absolute;
		top: -6px;
		left: 2px;
		animation: sun-turn 24s linear infinite;
	}

	@keyframes sun-turn {
		to {
			transform: rotate(360deg);
		}
	}
</style>

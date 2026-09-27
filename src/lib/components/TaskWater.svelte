<script lang="ts">
	import { WATER_DROPS } from '$lib/game/economy';
	import { actions, game } from '$lib/game/game.svelte';
	import { lines } from '$lib/game/lines';
	import { speak } from '$lib/game/speech';
	import { sounds } from '$lib/game/sounds';
	import Bubble from './Bubble.svelte';

	const DROPS = Array.from({ length: WATER_DROPS }, (_, i) => i);

	let used = $state<boolean[]>(DROPS.map(() => false));
	let bloom = $state(false);
	let splash = $state(0);

	let advancing = false;
	let timer: ReturnType<typeof setTimeout> | undefined;

	let spoke = $state(false);
	$effect(() => {
		if (spoke) return;
		spoke = true;
		speak(lines.water(game.state));
	});

	$effect(() => () => clearTimeout(timer));

	function tapDrop(index: number): void {
		if (used[index] || advancing) return;
		used[index] = true;
		splash += 1;
		sounds.pop();
		const count = used.filter(Boolean).length;
		if (count < WATER_DROPS) {
			actions.waterDrop();
		} else {
			bloom = true;
			sounds.chime();
			speak(lines.waterPaid(game.state));
			// Let the tree bloom, then the 3rd drop pays out.
			advancing = true;
			timer = setTimeout(() => actions.waterDrop(), 1600);
		}
	}
</script>

<div class="scene water">
	<Bubble tail="center">The little tree is thirsty!</Bubble>

	<div class="water-stage">
		<div class="drops">
			{#each DROPS as index (index)}
				<button
					type="button"
					class="drop"
					class:used={used[index]}
					data-testid="drop-{index}"
					aria-label="Water drop {index + 1}"
					disabled={used[index]}
					onclick={() => tapDrop(index)}
				>
					<svg viewBox="0 0 40 52" aria-hidden="true">
						<path d="M20 3 C 29 20, 35 28, 35 36 a15 15 0 1 1 -30 0 C 5 28, 11 20, 20 3 Z" fill="#bfe3f5" stroke="#7cbcd9" stroke-width="3" />
						<ellipse cx="13" cy="34" rx="4" ry="6" fill="#e8f6ff" />
					</svg>
				</button>
			{/each}
		</div>

		<div class="tree-zone">
			{#key splash}
				<span class="falling" aria-hidden="true"></span>
			{/key}
			<svg class="tree" class:bloom viewBox="0 0 220 220" role="img" aria-label="The little tree">
				<ellipse cx="110" cy="208" rx="86" ry="14" fill="#9ad29a" />
				<path d="M100 208 Q96 168 102 132 L122 132 Q128 170 124 208 Z" fill="#b9834f" />
				<path d="M110 148 Q88 138 78 120" fill="none" stroke="#b9834f" stroke-width="11" stroke-linecap="round" />
				<path d="M114 156 Q140 146 150 126" fill="none" stroke="#b9834f" stroke-width="10" stroke-linecap="round" />
				<circle cx="76" cy="96" r="46" fill="#9ad29a" />
				<circle cx="148" cy="86" r="40" fill="#8ed4c0" />
				<circle cx="112" cy="52" r="36" fill="#9ad29a" />
				<circle cx="58" cy="76" r="14" fill="#b6ebdd" opacity="0.8" />
				<circle cx="150" cy="60" r="12" fill="#b6ebdd" opacity="0.8" />
				{#if bloom}
					<g class="flowers">
						<g transform="translate(72 92)">
							<circle cx="0" cy="-9" r="7" fill="#ff8a66" />
							<circle cx="9" cy="0" r="7" fill="#ff8a66" />
							<circle cx="0" cy="9" r="7" fill="#ff8a66" />
							<circle cx="-9" cy="0" r="7" fill="#ff8a66" />
							<circle r="6" fill="#ffd35c" />
						</g>
						<g transform="translate(126 66)">
							<circle cx="0" cy="-8" r="6" fill="#ffd35c" />
							<circle cx="8" cy="0" r="6" fill="#ffd35c" />
							<circle cx="0" cy="8" r="6" fill="#ffd35c" />
							<circle cx="-8" cy="0" r="6" fill="#ffd35c" />
							<circle r="5" fill="#ff8a66" />
						</g>
						<g transform="translate(156 96)">
							<circle cx="0" cy="-8" r="6" fill="#ff8a66" />
							<circle cx="8" cy="0" r="6" fill="#ff8a66" />
							<circle cx="0" cy="8" r="6" fill="#ff8a66" />
							<circle cx="-8" cy="0" r="6" fill="#ff8a66" />
							<circle r="5" fill="#fffdf8" />
						</g>
						<g transform="translate(104 44)">
							<circle cx="0" cy="-7" r="5.5" fill="#ffd35c" />
							<circle cx="7" cy="0" r="5.5" fill="#ffd35c" />
							<circle cx="0" cy="7" r="5.5" fill="#ffd35c" />
							<circle cx="-7" cy="0" r="5.5" fill="#ffd35c" />
							<circle r="4.5" fill="#8ed4c0" />
						</g>
					</g>
				{/if}
			</svg>
		</div>
	</div>
</div>

<style>
	.water-stage {
		position: relative;
		width: 100%;
		max-width: 440px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
	}

	.drops {
		display: flex;
		gap: 14px;
		z-index: 2;
	}

	.drop {
		width: 92px;
		height: 104px;
		border: none;
		background: transparent;
		cursor: pointer;
		padding: 4px;
		filter: drop-shadow(0 8px 10px rgba(74, 55, 40, 0.16));
		animation: drop-float 2.6s ease-in-out infinite;
	}

	.drop:nth-child(2) {
		animation-delay: 0.4s;
	}
	.drop:nth-child(3) {
		animation-delay: 0.8s;
	}

	.drop svg {
		width: 100%;
		height: 100%;
	}

	.drop:active {
		scale: 0.9;
	}

	.drop.used {
		opacity: 0.22;
		filter: saturate(0.2);
		animation: none;
	}

	@keyframes drop-float {
		50% {
			transform: translateY(-7px);
		}
	}

	.tree-zone {
		position: relative;
		width: min(360px, 88vw);
	}

	.tree {
		width: 100%;
		height: auto;
	}

	.tree.bloom {
		animation: tree-bloom 0.9s cubic-bezier(0.2, 1.5, 0.4, 1);
	}

	@keyframes tree-bloom {
		0% {
			transform: scale(1);
		}
		35% {
			transform: scale(1.06, 0.94);
		}
		65% {
			transform: scale(0.98, 1.04);
		}
		100% {
			transform: scale(1);
		}
	}

	.flowers {
		transform-box: fill-box;
		transform-origin: center;
		animation: flowers-in 0.8s cubic-bezier(0.2, 1.6, 0.4, 1) both;
	}

	@keyframes flowers-in {
		from {
			opacity: 0;
			transform: scale(0.2);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	.falling {
		position: absolute;
		left: 50%;
		top: -10px;
		width: 22px;
		height: 28px;
		margin-left: -11px;
		border-radius: 50% 50% 50% 50% / 62% 62% 38% 38%;
		background: #bfe3f5;
		animation: drop-fall 0.55s ease-in both;
		z-index: 3;
	}

	@keyframes drop-fall {
		from {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
		to {
			opacity: 0;
			transform: translateY(120px) scale(0.6);
		}
	}
</style>

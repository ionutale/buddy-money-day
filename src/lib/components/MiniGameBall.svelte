<script lang="ts">
	import { sounds } from '$lib/game/sounds';
	import GoalItem from './GoalItem.svelte';
	import HouseButton from './HouseButton.svelte';

	/**
	 * Keepy-uppy, no-fail: the ball waits on the floor until the first tap,
	 * then it is alive — the floor keeps bouncing it and every tap sends it
	 * higher with a squish, a boing, and sparkles. No score, no end, and the
	 * house button never leaves the screen.
	 */

	type Props = {
		/** The house button: back to the room. */
		onexit: () => void;
	};

	let { onexit }: Props = $props();

	let house = $state<ReturnType<typeof HouseButton> | undefined>();

	// Keyboard entry: the house takes focus as the game opens.
	$effect(() => {
		house?.focus();
	});

	const GRAVITY = 2400; // px/s² pulling the ball down
	const AUTO_BOUNCE = 950; // px/s the floor kicks the ball back up with
	const TAP_MIN = 1320; // px/s a tap launches with…
	const TAP_MAX = 1580; // …plus a little random so taps feel alive
	const FLOOR = 56; // px the resting ball hovers above the stage bottom
	const BALL = 150;
	const MAX_SPARKLES = 15;

	/** Lift above the floor, px. */
	let y = $state(0);
	/** Vertical speed, px/s — positive is up. */
	let vy = $state(0);
	/** The first tap wakes the ball; from then on it never rests. */
	let alive = $state(false);
	let bounces = $state(0);

	let frame = 0;
	let last = 0;

	$effect(() => {
		last = performance.now();
		const step = (now: number) => {
			const dt = Math.min((now - last) / 1000, 0.05);
			last = now;
			vy -= GRAVITY * dt;
			y += vy * dt;
			if (y <= 0) {
				y = 0;
				vy = alive ? AUTO_BOUNCE : 0;
			}
			frame = requestAnimationFrame(step);
		};
		frame = requestAnimationFrame(step);
		return () => cancelAnimationFrame(frame);
	});

	type Sparkle = {
		id: number;
		base: number;
		dx: number;
		dy: number;
		size: number;
		color: string;
	};

	let sparkles = $state<Sparkle[]>([]);
	let nextSparkle = 0;
	const SPARKLE_COLORS = ['#ffd35c', '#ff8a66', '#8ed4c0'];

	function bounce(): void {
		alive = true;
		bounces += 1;
		vy = TAP_MIN + Math.random() * (TAP_MAX - TAP_MIN);
		sounds.pop();
		spawnSparkles();
	}

	function spawnSparkles(): void {
		// Tap-spam safety: only a bounded handful of sparkles at a time.
		if (sparkles.length >= MAX_SPARKLES) return;
		const base = FLOOR + y + BALL / 2;
		const born: Sparkle[] = [];
		for (let i = 0; i < 3; i++) {
			born.push({
				id: nextSparkle++,
				base,
				dx: -74 + Math.random() * 148,
				dy: -18 + Math.random() * 96,
				size: 20 + Math.random() * 18,
				color: SPARKLE_COLORS[Math.floor(Math.random() * SPARKLE_COLORS.length)]
			});
		}
		sparkles = [...sparkles, ...born];
	}

	function clearSparkle(id: number): void {
		sparkles = sparkles.filter((sparkle) => sparkle.id !== id);
	}
</script>

<div class="mini-stage">
	<!-- Every tap anywhere on the stage bounces the ball: a 4-year-old can’t miss. -->
	<button type="button" class="bounce-zone" aria-label="Bounce the ball" onclick={bounce}></button>

	<div class="mini-floor" aria-hidden="true"></div>

	<div
		class="game-ball"
		data-testid="mini-game-ball"
		data-bounces={bounces}
		style="bottom: {FLOOR + y}px"
	>
		{#key bounces}
			<span class="ball-squish">
				<GoalItem kind="ball" size={BALL} />
			</span>
		{/key}
	</div>

	{#each sparkles as sparkle (sparkle.id)}
		<span
			class="spark"
			aria-hidden="true"
			style="left: calc(50% + {sparkle.dx}px); bottom: {sparkle.base + sparkle.dy}px; width: {sparkle.size}px; height: {sparkle.size}px"
			onanimationend={() => clearSparkle(sparkle.id)}
		>
			<svg viewBox="0 0 24 24">
				<path
					d="M12 1 l3.2 7.8 7.8 3.2 -7.8 3.2 -3.2 7.8 -3.2-7.8 -7.8-3.2 7.8-3.2 z"
					fill={sparkle.color}
				/>
			</svg>
		</span>
	{/each}

	<HouseButton
		testid="mini-game-exit"
		label="Back to my toys"
		onexit={onexit}
		bind:this={house}
	/>
</div>

<style>
	.mini-stage {
		position: fixed;
		inset: 0;
		z-index: 90;
		overflow: hidden;
		background: linear-gradient(180deg, #bfe3f5 0%, #ddf2fc 55%, #fff6e5 100%);
		animation: scene-in 0.4s ease both;
	}

	/* Two soft clouds, politely out of the way of taps. */
	.mini-stage::before,
	.mini-stage::after {
		content: '';
		position: absolute;
		pointer-events: none;
		width: 120px;
		height: 44px;
		border-radius: 999px;
		background: rgba(255, 253, 248, 0.78);
		box-shadow:
			34px -16px 0 -6px rgba(255, 253, 248, 0.78),
			66px 0 0 -10px rgba(255, 253, 248, 0.78);
	}

	.mini-stage::before {
		top: 12%;
		left: 8%;
	}

	.mini-stage::after {
		top: 26%;
		right: 4%;
		scale: 0.8;
	}

	.bounce-zone {
		position: absolute;
		inset: 0;
		border: none;
		background: transparent;
		cursor: pointer;
	}

	.bounce-zone:focus-visible {
		outline: 5px solid var(--sky);
		outline-offset: -10px;
	}

	.mini-floor {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		height: 96px;
		border-radius: 50% 50% 0 0 / 40px 40px 0 0;
		background: linear-gradient(180deg, #9ad29a, #7dbf7d);
		pointer-events: none;
	}

	.game-ball {
		position: absolute;
		left: 50%;
		translate: -50% 0;
		pointer-events: none;
	}

	.game-ball :global(.goal-item) {
		filter: drop-shadow(0 12px 14px rgba(74, 55, 40, 0.2));
	}

	.ball-squish {
		display: block;
		transform-origin: 50% 88%;
		animation: squish 0.26s cubic-bezier(0.3, 0.8, 0.4, 1.3) both;
	}

	@keyframes squish {
		0% {
			transform: scale(1, 1);
		}
		38% {
			transform: scale(1.14, 0.8);
		}
		72% {
			transform: scale(0.95, 1.07);
		}
		100% {
			transform: scale(1, 1);
		}
	}

	.spark {
		position: absolute;
		translate: -50% 0;
		pointer-events: none;
		animation: spark-float 0.72s ease-out both;
	}

	@keyframes spark-float {
		0% {
			opacity: 0;
			scale: 0.4;
		}
		25% {
			opacity: 1;
		}
		100% {
			opacity: 0;
			scale: 1.25;
			translate: -50% -34px;
		}
	}

</style>

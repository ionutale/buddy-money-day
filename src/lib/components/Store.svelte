<script lang="ts">
	import { TOY_LABELS, TOY_PRICES } from '$lib/game/economy';
	import { banner } from '$lib/game/banner.svelte';
	import { flyCoins, goalSlotPoint, hudCoinPoint } from '$lib/game/flights.svelte';
	import { actions, game } from '$lib/game/game.svelte';
	import { lines, storeCompare } from '$lib/game/lines';
	import { savePreview } from '$lib/game/state';
	import { speak } from '$lib/game/speech';
	import { sounds } from '$lib/game/sounds';
	import { toast } from '$lib/game/toasts.svelte';
	import Bubble from './Bubble.svelte';
	import Coin from './Coin.svelte';
	import GoalItem from './GoalItem.svelte';

	/**
	 * The day's decision beat: the shelf sells toys (slice 1: the ball alone),
	 * the pedestal shows the dream, and the big button stays the default path —
	 * every held coin goes to the jar (ADR-0002). Buying is deliberate, a
	 * short celebration beat, and restates the dream.
	 */
	const goal = $derived(game.state.goal);
	const price = $derived(TOY_PRICES[goal]);
	const ownsBall = $derived(game.state.owned.includes('ball'));
	const canAffordBall = $derived(game.state.coins >= TOY_PRICES.ball);
	const preview = $derived(savePreview(game.state));

	let compare = $state<string | null>(null);
	let saving = $state(false);
	let buying = $state(false);
	let ballEl: HTMLButtonElement | undefined = $state();
	let saveEl: HTMLButtonElement | undefined = $state();
	let timer: ReturnType<typeof setTimeout> | undefined;

	// While choosing, the dream banner shows what saving WOULD accomplish.
	$effect(() => {
		banner.preview = preview.filled;
		return () => {
			banner.preview = null;
		};
	});

	let spoke = $state(false);
	$effect(() => {
		if (spoke) return;
		spoke = true;
		speak(lines.store(game.state));
	});

	$effect(() => () => clearTimeout(timer));

	/** The buy beat: the coins leave the hand, the toy lands, the shelf updates. */
	function celebrateBuy(): void {
		buying = true;
		sounds.pop();
		speak(lines.storeBought(game.state));
		toast(`${lines.storeBought(game.state)} ${lines.dreamStands(game.state)}`);
		const rect = ballEl?.getBoundingClientRect();
		flyCoins({
			from: hudCoinPoint(),
			to: rect
				? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
				: { x: innerWidth / 2, y: innerHeight / 2 },
			count: TOY_PRICES.ball
		});
		timer = setTimeout(() => {
			actions.buyToy('ball');
			buying = false;
		}, 1600);
	}

	function tapBall(): void {
		if (saving || buying) return;
		if (ownsBall) {
			speak(lines.storeOwned(game.state));
			return;
		}
		if (!canAffordBall) {
			compare = storeCompare('ball', game.state);
			speak(compare);
			return;
		}
		compare = null;
		celebrateBuy();
	}

	function saveTheRest(): void {
		if (saving || buying) return;
		saving = true;
		sounds.coin();
		speak(lines.storeSave(game.state));
		toast(lines.storeSave(game.state));
		const rect = saveEl?.getBoundingClientRect();
		const from = rect
			? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
			: { x: innerWidth / 2, y: innerHeight / 2 };
		// The coins land on the last dream slot this save fills — the banner,
		// never the HUD counter (the Task 1 parked fix).
		if (game.state.coins > 0) {
			flyCoins({ from, to: goalSlotPoint(Math.max(0, preview.filled - 1)), count: game.state.coins });
		}
		// The coins land in the jar, then the day moves on.
		timer = setTimeout(() => {
			actions.saveRemainder();
			actions.storeDone();
		}, 1600);
	}
</script>

<div class="scene store">
	<Bubble tail="center">{lines.store(game.state)}</Bubble>

	<div class="store-shelf" data-testid="store-shelf">
		<div class="shelf-spot">
			<button
				type="button"
				class="shelf-toy"
				class:owned={ownsBall}
				class:buying={buying}
				data-testid="store-toy-ball"
				data-owned={ownsBall ? 'true' : 'false'}
				aria-label={ownsBall ? 'The ball is in your room' : `The ball, ${TOY_PRICES.ball} coins`}
				bind:this={ballEl}
				onclick={tapBall}
			>
				{#if buying}
					<span class="buy-beat" data-testid="store-buy-beat">
						<svg class="beat-ball" viewBox="0 0 80 80" aria-hidden="true">
							<circle cx="40" cy="40" r="33" fill="#ff8a66" />
							<path d="M10 30 Q40 48 70 30" fill="none" stroke="#fffdf8" stroke-width="7" />
							<path d="M18 58 Q40 70 62 58" fill="none" stroke="#ffd35c" stroke-width="7" />
							<circle cx="28" cy="26" r="6" fill="#fffdf8" opacity="0.85" />
						</svg>
						<svg class="beat-spark beat-spark-a sparkle" viewBox="0 0 24 24" aria-hidden="true">
							<path d="M12 1 l3.2 7.8 7.8 3.2 -7.8 3.2 -3.2 7.8 -3.2-7.8 -7.8-3.2 7.8-3.2 z" fill="#ffd35c" />
						</svg>
						<svg class="beat-spark beat-spark-b sparkle" viewBox="0 0 24 24" aria-hidden="true">
							<path d="M12 1 l3.2 7.8 7.8 3.2 -7.8 3.2 -3.2 7.8 -3.2-7.8 -7.8-3.2 7.8-3.2 z" fill="#ff8a66" />
						</svg>
					</span>
				{:else if ownsBall}
					<svg class="toy-art" viewBox="0 0 80 80" aria-hidden="true">
						<circle cx="40" cy="40" r="33" fill="#ff8a66" />
						<path d="M10 30 Q40 48 70 30" fill="none" stroke="#fffdf8" stroke-width="7" />
						<path d="M18 58 Q40 70 62 58" fill="none" stroke="#ffd35c" stroke-width="7" />
						<circle cx="28" cy="26" r="6" fill="#fffdf8" opacity="0.85" />
					</svg>
					<span class="toy-home">✓ In your room!</span>
				{:else}
					<svg class="toy-art" viewBox="0 0 80 80" aria-hidden="true">
						<circle cx="40" cy="40" r="33" fill="#ff8a66" />
						<path d="M10 30 Q40 48 70 30" fill="none" stroke="#fffdf8" stroke-width="7" />
						<path d="M18 58 Q40 70 62 58" fill="none" stroke="#ffd35c" stroke-width="7" />
						<circle cx="28" cy="26" r="6" fill="#fffdf8" opacity="0.85" />
					</svg>
					<span class="toy-price"><Coin size={26} />{TOY_PRICES.ball}</span>
				{/if}
			</button>
			<span class="shelf-plank" aria-hidden="true"></span>
		</div>

		<div
			class="store-dream"
			data-testid="store-dream"
			aria-label="Saving for your {TOY_LABELS[goal]}"
		>
			<GoalItem kind={goal} size={104} />
			<span class="dream-pedestal" aria-hidden="true"></span>
			<span class="dream-progress">{game.state.jarCoins} / {price}</span>
			<span class="dream-label">{TOY_LABELS[goal]}</span>
		</div>
	</div>

	{#if compare}
		<p class="compare" data-testid="store-unaffordable" role="status">{compare}</p>
	{/if}

	<button
		type="button"
		class="btn btn-primary btn-huge save-btn"
		bind:this={saveEl}
		data-testid="store-save-button"
		disabled={saving || buying}
		onclick={saveTheRest}
	>
		{lines.storeSave(game.state)}
	</button>
</div>

<style>
	.store-shelf {
		display: flex;
		align-items: flex-end;
		justify-content: center;
		gap: 16px;
		width: 100%;
		padding: 18px 12px 14px;
		background: rgba(255, 253, 248, 0.72);
		border-radius: 32px;
		box-shadow: inset 0 0 0 4px rgba(74, 55, 40, 0.06);
	}

	.shelf-spot {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.shelf-toy {
		width: 150px;
		min-height: 170px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 4px;
		padding: 6px;
		border: none;
		background: transparent;
		cursor: pointer;
	}

	.shelf-toy:active {
		scale: 0.97;
	}

	.toy-art {
		width: 108px;
		height: auto;
		filter: drop-shadow(0 8px 10px rgba(74, 55, 40, 0.18));
	}

	.shelf-toy.owned .toy-art {
		filter: saturate(0.6) drop-shadow(0 6px 8px rgba(74, 55, 40, 0.14));
	}

	.toy-price {
		display: inline-flex;
		align-items: center;
		gap: 2px;
		font-size: 24px;
		font-weight: 700;
	}

	.toy-home {
		font-size: 17px;
		font-weight: 700;
		color: var(--grass-deep);
		text-align: center;
	}

	.shelf-plank {
		width: 168px;
		height: 16px;
		margin-top: -2px;
		border-radius: 8px 8px 12px 12px;
		background: linear-gradient(180deg, #e0b477, #c89454);
		box-shadow:
			inset 0 4px 0 rgba(255, 255, 255, 0.22),
			inset 0 -5px 0 rgba(74, 55, 40, 0.14),
			0 5px 0 rgba(74, 55, 40, 0.1);
	}

	.buy-beat {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.beat-ball {
		width: 126px;
		height: auto;
		animation: buy-pop 0.6s cubic-bezier(0.2, 1.5, 0.4, 1) both;
		filter: drop-shadow(0 10px 12px rgba(74, 55, 40, 0.22));
	}

	@keyframes buy-pop {
		from {
			opacity: 0;
			transform: scale(0.3) rotate(-12deg);
		}
		to {
			opacity: 1;
			transform: scale(1) rotate(0deg);
		}
	}

	.beat-spark {
		position: absolute;
		width: 34px;
		height: 34px;
	}

	.beat-spark-a {
		top: 0;
		left: 2px;
	}

	.beat-spark-b {
		right: 2px;
		bottom: 4px;
	}

	.store-dream {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
	}

	.dream-pedestal {
		width: 132px;
		height: 18px;
		margin-top: -8px;
		border-radius: 10px 10px 14px 14px;
		background: linear-gradient(180deg, #ffe9a8, #ffd35c);
		box-shadow:
			inset 0 4px 0 rgba(255, 255, 255, 0.55),
			inset 0 -5px 0 rgba(74, 55, 40, 0.12),
			0 5px 0 rgba(74, 55, 40, 0.1);
	}

	.dream-progress {
		margin-top: 6px;
		padding: 4px 14px;
		border-radius: 999px;
		background: #fffdf8;
		font-size: 20px;
		font-weight: 700;
		box-shadow: 0 4px 0 rgba(74, 55, 40, 0.1);
	}

	.dream-label {
		font-size: 16px;
		font-weight: 600;
		color: var(--ink-soft);
	}

	.compare {
		margin: 0;
		font-size: 19px;
		font-weight: 600;
		text-align: center;
	}

	.save-btn {
		width: 100%;
	}
</style>

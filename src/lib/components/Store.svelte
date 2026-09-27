<script lang="ts">
	import { TOY_LABELS, TOY_PRICES } from '$lib/game/economy';
	import { banner } from '$lib/game/banner.svelte';
	import { flyCoins, hudCoinPoint } from '$lib/game/flights.svelte';
	import { actions, game } from '$lib/game/game.svelte';
	import { lines, storeCompare } from '$lib/game/lines';
	import { savePreview } from '$lib/game/state';
	import { speak } from '$lib/game/speech';
	import { sounds } from '$lib/game/sounds';
	import { toast } from '$lib/game/toasts.svelte';
	import Bubble from './Bubble.svelte';
	import Coin from './Coin.svelte';
	import GoalItem from './GoalItem.svelte';

	// Placeholder store (Task 4 replaces it): the slice-1 shelf is the ball
	// alone (nothing is sold without its game), plus the dream pedestal and
	// the default save button. Plain visuals, real wiring.
	const ownsBall = $derived(game.state.owned.includes('ball'));
	const canAffordBall = $derived(game.state.coins >= TOY_PRICES.ball);
	const preview = $derived(savePreview(game.state));

	let compare = $state<string | null>(null);
	let saving = $state(false);
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

	function tapBall(): void {
		if (saving) return;
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
		sounds.pop();
		actions.buyToy('ball');
		speak(lines.storeBought(game.state));
		toast(`${lines.storeBought(game.state)} ${lines.dreamStands(game.state)}`);
	}

	function saveTheRest(): void {
		if (saving) return;
		saving = true;
		sounds.coin();
		speak(lines.storeSave(game.state));
		toast(lines.storeSave(game.state));
		const rect = saveEl?.getBoundingClientRect();
		flyCoins({
			from: rect
				? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
				: { x: innerWidth / 2, y: innerHeight / 2 },
			to: hudCoinPoint(),
			count: game.state.coins
		});
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
		<button
			type="button"
			class="shelf-toy"
			class:owned={ownsBall}
			data-testid="store-toy-ball"
			data-owned={ownsBall ? 'true' : 'false'}
			aria-label={ownsBall ? 'The ball is in your room' : `The ball, ${TOY_PRICES.ball} coins`}
			onclick={tapBall}
		>
			<svg viewBox="0 0 80 80" aria-hidden="true">
				<circle cx="40" cy="40" r="33" fill="#ff8a66" />
				<path d="M10 30 Q40 48 70 30" fill="none" stroke="#fffdf8" stroke-width="7" />
				<path d="M18 58 Q40 70 62 58" fill="none" stroke="#ffd35c" stroke-width="7" />
				<circle cx="28" cy="26" r="6" fill="#fffdf8" opacity="0.85" />
			</svg>
			<span class="toy-state">
				{#if ownsBall}
					{lines.storeOwned(game.state)}
				{:else}
					<span class="toy-price"><Coin size={26} />{TOY_PRICES.ball}</span>
				{/if}
			</span>
		</button>

		<div class="store-dream" data-testid="store-dream" aria-label="Saving for your {TOY_LABELS[game.state.goal]}">
			<GoalItem kind={game.state.goal} size={110} />
			<span class="dream-progress">{game.state.jarCoins} / {TOY_PRICES[game.state.goal]}</span>
			<span class="dream-label">{TOY_LABELS[game.state.goal]}</span>
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
		disabled={saving}
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
		gap: 18px;
		width: 100%;
		padding: 16px;
		background: rgba(255, 253, 248, 0.7);
		border-radius: 32px;
	}

	.shelf-toy {
		width: 150px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
		border: none;
		background: #fffdf8;
		border-radius: 28px;
		padding: 12px;
		cursor: pointer;
		box-shadow: 0 6px 0 rgba(74, 55, 40, 0.12);
	}

	.shelf-toy svg {
		width: 100%;
		height: auto;
	}

	.shelf-toy.owned {
		filter: saturate(0.6);
		opacity: 0.8;
	}

	.toy-price {
		display: inline-flex;
		align-items: center;
		gap: 2px;
		font-size: 22px;
		font-weight: 700;
	}

	.toy-state {
		font-size: 16px;
		font-weight: 600;
		color: var(--ink-soft);
		text-align: center;
	}

	.store-dream {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
	}

	.dream-progress {
		font-size: 20px;
		font-weight: 700;
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

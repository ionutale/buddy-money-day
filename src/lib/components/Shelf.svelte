<script lang="ts">
	import { GOAL_COST, LOLLIPOP_COST } from '$lib/game/economy';
	import { banner } from '$lib/game/banner.svelte';
	import { flyCoins, hudCoinPoint } from '$lib/game/flights.svelte';
	import { actions, game } from '$lib/game/game.svelte';
	import { lines } from '$lib/game/lines';
	import { savePreview } from '$lib/game/state';
	import { speak } from '$lib/game/speech';
	import { sounds } from '$lib/game/sounds';
	import { toast } from '$lib/game/toasts.svelte';
	import Bubble from './Bubble.svelte';
	import Coin from './Coin.svelte';
	import Jar from './Jar.svelte';

	let wiggle = $state(false);
	let timer: ReturnType<typeof setTimeout> | undefined;
	let lollipopEl: HTMLButtonElement | undefined = $state();

	const preview = $derived(savePreview(game.state));

	$effect(() => {
		// While choosing, the Goal banner shows what saving WOULD accomplish.
		banner.preview = Math.min(game.state.jarCoins + game.state.coins, GOAL_COST);
		return () => {
			banner.preview = null;
		};
	});

	let spoke = $state(false);
	$effect(() => {
		if (spoke) return;
		spoke = true;
		speak(lines.shelf(game.state));
	});

	$effect(() => () => clearTimeout(timer));

	function save(): void {
		sounds.coin();
		speak(lines.shelfSave(game.state));
		actions.saveAll();
	}

	function buy(): void {
		if (game.state.coins < LOLLIPOP_COST || game.state.lollipopToday) {
			sounds.sad();
			speak(lines.shelfNoCoins(game.state));
			wiggle = true;
			timer = setTimeout(() => (wiggle = false), 600);
			return;
		}
		actions.buyLollipop();
		sounds.pop();
		speak(lines.lollipopGoal(game.state));
		toast(lines.lollipopGoal(game.state));
		const rect = lollipopEl?.getBoundingClientRect();
		flyCoins({
			from: hudCoinPoint(),
			to: rect
				? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
				: { x: innerWidth / 2, y: innerHeight / 2 },
			count: LOLLIPOP_COST
		});
	}

	function continueOn(): void {
		sounds.chime();
		speak(lines.lollipopContinue(game.state));
		actions.continueAfterLollipop();
	}
</script>

<div class="scene shelf">
	{#if game.state.lollipopToday}
		<!-- Buying the Temptation is always praised, never shamed. -->
		<div class="praise pop-in" data-testid="lollipop-bought">
			<svg class="lollipop big" viewBox="0 0 100 130" role="img" aria-label="A lollipop">
				<rect x="47" y="56" width="7" height="68" rx="3.5" fill="#fffdf8" stroke="#4a3728" stroke-width="3" />
				<circle cx="50" cy="42" r="35" fill="#ff8a66" stroke="#4a3728" stroke-width="4" />
				<path d="M50 42 m0 -27 a27 27 0 0 1 0 54 a19 19 0 0 1 0 -38 a11 11 0 0 1 0 22" fill="none" stroke="#fffdf8" stroke-width="8" stroke-linecap="round" />
				<circle cx="36" cy="24" r="6" fill="#fffdf8" opacity="0.85" />
			</svg>
			<p class="praise-text">Yummy! Treats are okay. The rest goes to your jar.</p>
			<button type="button" class="btn btn-primary btn-huge" data-testid="lollipop-continue" onclick={continueOn}>
				To the jar!
			</button>
		</div>
	{:else}
	<div
		class="shelf-outcome"
		data-testid="shelf-preview"
		data-preview-filled={preview.filled}
		data-complete={preview.completes ? 'true' : 'false'}
	>
		{#if preview.completes}
			<span class="complete-line">{lines.shelfComplete(game.state)}</span>
		{/if}
	</div>

		<Bubble tail="center">{lines.shelf(game.state)}</Bubble>

		<div class="shelf-items">
			<div class="shelf-jar">
				<Jar fill={game.state.jarCoins} size={148} />
				<span class="shelf-tag">Save it</span>
			</div>
			<button
				type="button"
				class="lollipop"
				class:wiggle
				bind:this={lollipopEl}
				data-testid="shelf-lollipop"
				aria-label="Take a lollipop for two coins"
				onclick={buy}
			>
				<svg viewBox="0 0 100 130" aria-hidden="true">
					<rect x="47" y="56" width="7" height="68" rx="3.5" fill="#fffdf8" stroke="#4a3728" stroke-width="3" />
					<circle cx="50" cy="42" r="35" fill="#ff8a66" stroke="#4a3728" stroke-width="4" />
					<path d="M50 42 m0 -27 a27 27 0 0 1 0 54 a19 19 0 0 1 0 -38 a11 11 0 0 1 0 22" fill="none" stroke="#fffdf8" stroke-width="8" stroke-linecap="round" />
					<circle cx="36" cy="24" r="6" fill="#fffdf8" opacity="0.85" />
				</svg>
				<span class="price"><Coin size={26} />{LOLLIPOP_COST}</span>
			</button>
		</div>

		<button type="button" class="btn btn-primary btn-huge save-btn" data-testid="shelf-save" onclick={save}>
			<svg width="34" height="34" viewBox="0 0 48 48" aria-hidden="true">
				<path d="M24 6 L42 24 L24 42 L6 24 Z" fill="#ffd35c" stroke="#4a3728" stroke-width="3" stroke-linejoin="round" />
				<path d="M24 6 L24 42 M6 24 L42 24" stroke="#4a3728" stroke-width="2" opacity="0.4" />
			</svg>
			Put the coins in the jar
		</button>
	{/if}
</div>

<style>
	.shelf-outcome {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 34px;
	}

	.complete-line {
		font-size: 21px;
		font-weight: 700;
		color: #e8a93a;
		text-shadow: 0 2px 0 #fffdf8;
		animation: pop-in 0.5s cubic-bezier(0.2, 1.5, 0.4, 1) both;
	}

	.shelf-items {
		display: flex;
		align-items: flex-end;
		justify-content: center;
		gap: 18px;
		width: 100%;
	}

	.shelf-jar {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
	}

	.shelf-tag {
		font-size: 17px;
		font-weight: 600;
		color: var(--ink-soft);
	}

	.lollipop {
		position: relative;
		width: 112px;
		border: none;
		background: rgba(255, 253, 248, 0.85);
		border-radius: 30px;
		padding: 10px 10px 6px;
		cursor: pointer;
		box-shadow: 0 6px 0 rgba(74, 55, 40, 0.12), 0 12px 20px rgba(74, 55, 40, 0.12);
		animation: lolli-offer 2.8s ease-in-out infinite;
	}

	.lollipop svg {
		width: 100%;
		height: auto;
	}

	.lollipop:active {
		translate: 0 4px;
	}

	.lollipop.wiggle {
		animation: bowl-wobble 0.5s ease-in-out;
	}

	@keyframes bowl-wobble {
		25% {
			transform: translateX(-8px) rotate(-2deg);
		}
		75% {
			transform: translateX(8px) rotate(2deg);
		}
	}

	@keyframes lolli-offer {
		50% {
			transform: scale(1.05) rotate(-3deg);
		}
	}

	.price {
		position: absolute;
		right: 6px;
		bottom: 6px;
		display: inline-flex;
		align-items: center;
		gap: 2px;
		background: #fffdf8;
		border-radius: 999px;
		padding: 2px 10px 2px 4px;
		font-size: 20px;
		font-weight: 700;
		box-shadow: 0 3px 0 rgba(74, 55, 40, 0.12);
	}

	.save-btn {
		width: 100%;
	}

	.praise {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 14px;
		background: #fffdf8;
		border-radius: 40px;
		padding: 22px 24px 26px;
		box-shadow: 0 12px 32px rgba(74, 55, 40, 0.15);
		width: 100%;
	}

	.lollipop.big {
		width: 140px;
		animation: lolli-offer 1.6s ease-in-out infinite;
	}

	.praise-text {
		margin: 0;
		font-size: 21px;
		font-weight: 500;
		text-align: center;
	}
</style>

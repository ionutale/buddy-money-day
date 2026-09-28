<script lang="ts">
	import { FEED_REWARD } from '$lib/game/economy';
	import { flyCoins, hudCoinPoint } from '$lib/game/flights.svelte';
	import { actions, game } from '$lib/game/game.svelte';
	import { lines } from '$lib/game/lines';
	import { speak } from '$lib/game/speech';
	import { sounds } from '$lib/game/sounds';
	import { toast } from '$lib/game/toasts.svelte';
	import Buddy from './Buddy.svelte';
	import Bubble from './Bubble.svelte';
	import Coin from './Coin.svelte';

	// The feed chore: three snacks dragged into the bowl, any way the child
	// likes. Each bite munches and cheers the bear; the third bite pays.
	// No cost, no skip — care is rewarded, never priced.

	type SnackId = 0 | 1 | 2;

	const SNACKS: { id: SnackId; x: number; y: number }[] = [
		{ id: 0, x: 3, y: 5 },
		{ id: 1, x: 74, y: 30 },
		{ id: 2, x: 4, y: 62 }
	];

	const SNACK_COUNT = SNACKS.length;

	let bowlEl: HTMLButtonElement | undefined = $state();

	let offsets = $state<Record<SnackId, { x: number; y: number }>>({
		0: { x: 0, y: 0 },
		1: { x: 0, y: 0 },
		2: { x: 0, y: 0 }
	});
	let accepted = $state<Record<SnackId, boolean>>({ 0: false, 1: false, 2: false });
	let dragging = $state<SnackId | null>(null);
	let selected = $state<SnackId | null>(null);
	let paying = $state(false);

	let dragStart = { x: 0, y: 0 };
	let baseOffset = { x: 0, y: 0 };
	let moved = 0;
	let advancing = false;
	let timer: ReturnType<typeof setTimeout> | undefined;

	const bites = $derived(Object.values(accepted).filter(Boolean).length);
	// Hungry at the start, cheered up by the first bite, dancing on the third.
	const bearMood = $derived(paying ? 'celebrate' : bites > 0 ? 'happy' : 'hungry');

	let spoke = $state(false);
	$effect(() => {
		if (spoke) return;
		spoke = true;
		speak(lines.feed(game.state));
	});

	$effect(() => () => clearTimeout(timer));

	function onSnackDown(event: PointerEvent, id: SnackId): void {
		if (accepted[id] || paying) return;
		const el = event.currentTarget as HTMLButtonElement;
		try {
			el.setPointerCapture(event.pointerId);
		} catch {
			/* capture is a nicety; the tap fallback still works */
		}
		dragging = id;
		selected = null;
		dragStart = { x: event.clientX, y: event.clientY };
		baseOffset = { ...offsets[id] };
		moved = 0;
	}

	function onSnackMove(event: PointerEvent, id: SnackId): void {
		if (dragging !== id) return;
		const dx = event.clientX - dragStart.x;
		const dy = event.clientY - dragStart.y;
		moved = Math.max(moved, Math.hypot(dx, dy));
		offsets[id] = { x: baseOffset.x + dx, y: baseOffset.y + dy };
	}

	function onSnackUp(event: PointerEvent, id: SnackId): void {
		if (dragging !== id) return;
		dragging = null;
		const el = event.currentTarget as HTMLButtonElement;
		if (moved < 12) {
			// A tap lifts the snack instead; tapping the bowl feeds it.
			offsets[id] = { x: 0, y: 0 };
			selected = selected === id ? null : id;
			sounds.pop();
			return;
		}
		const snackRect = el.getBoundingClientRect();
		const bowlRect = bowlEl?.getBoundingClientRect();
		if (bowlRect && centerIn(snackRect, bowlRect)) {
			accept(id);
		} else {
			offsets[id] = { x: 0, y: 0 };
		}
	}

	function onSnackCancel(id: SnackId): void {
		if (dragging === id) dragging = null;
		offsets[id] = { x: 0, y: 0 };
	}

	function centerIn(inner: DOMRect, outer: DOMRect): boolean {
		const cx = inner.left + inner.width / 2;
		const cy = inner.top + inner.height / 2;
		return cx >= outer.left && cx <= outer.right && cy >= outer.top && cy <= outer.bottom;
	}

	function onBowlTap(): void {
		if (paying) return;
		if (selected !== null && !accepted[selected]) accept(selected);
	}

	function accept(id: SnackId): void {
		if (accepted[id] || paying) return;
		accepted[id] = true;
		selected = null;
		sounds.pop();
		const count = Object.values(accepted).filter(Boolean).length;
		if (count < SNACK_COUNT) return;
		payMoment();
	}

	/** The 3rd bite earns a short munch-and-dance beat before the board returns. */
	function payMoment(): void {
		if (advancing) return;
		advancing = true;
		paying = true;
		sounds.coin();
		speak(lines.feedPaid(game.state));
		toast(lines.feedPaid(game.state));
		const rect = bowlEl?.getBoundingClientRect();
		flyCoins({
			from: rect
				? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
				: { x: innerWidth / 2, y: innerHeight / 2 },
			to: hudCoinPoint(),
			count: FEED_REWARD
		});
		timer = setTimeout(() => actions.feedBear(), 1600);
	}
</script>

<div class="scene task-feed">
	<div class="task-head">
		<Bubble tail="center">{lines.feed(game.state)}</Bubble>
		<span class="price-tag" data-testid="price-tag-feed" aria-label="Pays {FEED_REWARD} coin">
			<Coin size={24} />{FEED_REWARD}
		</span>
	</div>

	<div class="feed-stage">
		<div class="bear-zone">
			{#key bites}
				<!-- Each bite remounts the bear, so its munch squish plays again. -->
				<div class="bear" class:munching={bites > 0}>
					<Buddy mood={bearMood} size={190} />
				</div>
			{/key}

			<button
				type="button"
				class="bowl"
				class:ready={dragging !== null || selected !== null}
				data-testid="bear-bowl"
				data-bites={bites}
				bind:this={bowlEl}
				onclick={onBowlTap}
				aria-label="Buddy's bowl"
			>
				<svg viewBox="0 0 160 90" aria-hidden="true">
					<path d="M14 34 Q80 22 146 34 L138 62 Q80 78 22 62 Z" fill="#ff8a66" stroke="#4a3728" stroke-width="4" stroke-linejoin="round" />
					<ellipse cx="80" cy="34" rx="66" ry="16" fill="#fffdf8" stroke="#4a3728" stroke-width="4" />
					{#if bites > 0}
						<circle cx="62" cy="32" r="7" fill="#e2574c" />
					{/if}
					{#if bites > 1}
						<circle cx="80" cy="28" r="7" fill="#e2574c" />
					{/if}
					{#if bites > 2}
						<circle cx="98" cy="32" r="7" fill="#e2574c" />
					{/if}
				</svg>
			</button>
		</div>

		{#each SNACKS as snack (snack.id)}
			<button
				type="button"
				class="snack"
				class:dragging={dragging === snack.id}
				class:selected={selected === snack.id}
				class:accepted={accepted[snack.id]}
				data-testid="feed-snack-{snack.id}"
				aria-label="Berry {snack.id + 1} of {SNACK_COUNT}"
				aria-disabled={accepted[snack.id] ? 'true' : undefined}
				tabindex={accepted[snack.id] ? -1 : undefined}
				style="left: min({snack.x}%, calc(100% - 104px)); top: {snack.y}%; --dx: {offsets[snack.id]
					.x}px; --dy: {offsets[snack.id].y}px"
				onpointerdown={(event) => onSnackDown(event, snack.id)}
				onpointermove={(event) => onSnackMove(event, snack.id)}
				onpointerup={(event) => onSnackUp(event, snack.id)}
				onpointercancel={() => onSnackCancel(snack.id)}
			>
				<svg viewBox="0 0 80 80" aria-hidden="true">
					<circle cx="40" cy="47" r="27" fill="#e2574c" />
					<circle cx="40" cy="47" r="27" fill="none" stroke="#b8433a" stroke-width="3" />
					<path d="M40 22 Q33 8 20 6 Q33 14 37 23 Z" fill="#7cc9b3" />
					<path d="M40 22 Q47 8 60 6 Q47 14 43 23 Z" fill="#7cc9b3" />
					<circle cx="32" cy="41" r="7" fill="#fffdf8" opacity="0.55" />
					<circle cx="50" cy="54" r="3" fill="#fffdf8" opacity="0.35" />
				</svg>
			</button>
		{/each}

		{#if paying}
			<div class="pay-moment" aria-hidden="true">
				<Coin size={64} />
				<span class="pay-plus">+{FEED_REWARD}</span>
			</div>
		{/if}
	</div>
</div>

<style>
	.task-head {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.price-tag {
		display: inline-flex;
		align-items: center;
		gap: 3px;
		flex: 0 0 auto;
		background: #fffdf8;
		border-radius: 999px;
		padding: 6px 12px 6px 6px;
		font-size: 22px;
		font-weight: 700;
		box-shadow: 0 4px 0 rgba(74, 55, 40, 0.1);
	}

	.feed-stage {
		position: relative;
		width: 100%;
		max-width: 480px;
		height: min(56vh, 430px);
		min-height: 360px;
	}

	.bear-zone {
		position: absolute;
		left: 50%;
		top: 0;
		translate: -50% 0;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.bear {
		transform-origin: 50% 88%;
	}

	.bear.munching {
		animation: bear-munch 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	@keyframes bear-munch {
		0% {
			transform: scale(1);
		}
		35% {
			transform: scale(1.07, 0.9);
		}
		65% {
			transform: scale(0.97, 1.04);
		}
		100% {
			transform: scale(1);
		}
	}

	.bowl {
		width: min(200px, 60vw);
		margin-top: -32px;
		padding: 0;
		border: none;
		background: transparent;
		cursor: pointer;
		filter: drop-shadow(0 8px 10px rgba(74, 55, 40, 0.16));
		transition: filter 0.18s ease;
	}

	.bowl svg {
		display: block;
		width: 100%;
		height: auto;
	}

	.bowl.ready {
		filter: drop-shadow(0 0 0 6px rgba(191, 227, 245, 0.95)) drop-shadow(0 8px 10px rgba(74, 55, 40, 0.16));
	}

	.snack {
		position: absolute;
		width: 92px;
		height: 92px;
		padding: 6px;
		border: none;
		background: transparent;
		cursor: grab;
		touch-action: none;
		z-index: 4;
		transform: translate(var(--dx), var(--dy));
		transition: transform 0.22s ease, scale 0.15s ease;
		filter: drop-shadow(0 8px 10px rgba(74, 55, 40, 0.18));
	}

	.snack svg {
		width: 100%;
		height: 100%;
	}

	.snack.dragging {
		cursor: grabbing;
		z-index: 6;
		scale: 1.15;
		transition: none;
	}

	.snack.selected {
		scale: 1.12;
		z-index: 5;
		filter: drop-shadow(0 0 0 5px rgba(191, 227, 245, 0.9)) drop-shadow(0 10px 12px rgba(74, 55, 40, 0.2));
		animation: selected-wiggle 0.9s ease-in-out infinite;
	}

	.snack.accepted {
		pointer-events: none;
		animation: snack-eaten 0.45s ease-in forwards;
	}

	@keyframes snack-eaten {
		to {
			scale: 0.12;
			opacity: 0;
		}
	}

	@keyframes selected-wiggle {
		50% {
			translate: 0 -8px;
		}
	}

	.pay-moment {
		position: absolute;
		left: 50%;
		bottom: 120px;
		translate: -50% 0;
		display: flex;
		align-items: center;
		gap: 6px;
		animation: pay-rise 1.6s ease-out both;
		z-index: 8;
	}

	.pay-plus {
		font-size: 34px;
		font-weight: 700;
		color: #e8a93a;
		text-shadow: 0 3px 0 #fffdf8;
	}

	@keyframes pay-rise {
		from {
			opacity: 0;
			transform: translateY(26px) scale(0.7);
		}
		25% {
			opacity: 1;
		}
		to {
			opacity: 1;
			transform: translateY(-46px) scale(1.05);
		}
	}
</style>

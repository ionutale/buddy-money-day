<script lang="ts">
	import { TIDY_REWARD, TIDY_TOYS } from '$lib/game/economy';
	import { actions, game } from '$lib/game/game.svelte';
	import { lines } from '$lib/game/lines';
	import { speak } from '$lib/game/speech';
	import { sounds } from '$lib/game/sounds';
	import Bubble from './Bubble.svelte';
	import Coin from './Coin.svelte';

	type ToyId = 0 | 1 | 2;
	type ToyKind = 'ball' | 'blocks' | 'teddy';

	const TOYS: { id: ToyId; kind: ToyKind; x: number; y: number }[] = [
		{ id: 0, kind: 'ball', x: 8, y: 16 },
		{ id: 1, kind: 'blocks', x: 56, y: 6 },
		{ id: 2, kind: 'teddy', x: 32, y: 40 }
	];

	let boxEl: HTMLButtonElement | undefined = $state();

	let offsets = $state<Record<ToyId, { x: number; y: number }>>({
		0: { x: 0, y: 0 },
		1: { x: 0, y: 0 },
		2: { x: 0, y: 0 }
	});
	let accepted = $state<Record<ToyId, boolean>>({ 0: false, 1: false, 2: false });
	let dragging = $state<ToyId | null>(null);
	let selected = $state<ToyId | null>(null);
	let paying = $state(false);

	let dragStart = { x: 0, y: 0 };
	let baseOffset = { x: 0, y: 0 };
	let moved = 0;
	let advancing = false;
	let timer: ReturnType<typeof setTimeout> | undefined;

	let spoke = $state(false);
	$effect(() => {
		if (spoke) return;
		spoke = true;
		speak(lines.tidy(game.state));
	});

	$effect(() => () => clearTimeout(timer));

	function onToyDown(event: PointerEvent, id: ToyId): void {
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

	function onToyMove(event: PointerEvent, id: ToyId): void {
		if (dragging !== id) return;
		const dx = event.clientX - dragStart.x;
		const dy = event.clientY - dragStart.y;
		moved = Math.max(moved, Math.hypot(dx, dy));
		offsets[id] = { x: baseOffset.x + dx, y: baseOffset.y + dy };
	}

	function onToyUp(event: PointerEvent, id: ToyId): void {
		if (dragging !== id) return;
		dragging = null;
		const el = event.currentTarget as HTMLButtonElement;
		if (moved < 12) {
			// A tap lifts the toy instead; tapping the box drops it there.
			offsets[id] = { x: 0, y: 0 };
			selected = selected === id ? null : id;
			sounds.pop();
			return;
		}
		const toyRect = el.getBoundingClientRect();
		const boxRect = boxEl?.getBoundingClientRect();
		if (boxRect && centerIn(toyRect, boxRect)) {
			accept(id);
		} else {
			offsets[id] = { x: 0, y: 0 };
		}
	}

	function onToyCancel(id: ToyId): void {
		if (dragging === id) dragging = null;
		offsets[id] = { x: 0, y: 0 };
	}

	function centerIn(inner: DOMRect, outer: DOMRect): boolean {
		const cx = inner.left + inner.width / 2;
		const cy = inner.top + inner.height / 2;
		return cx >= outer.left && cx <= outer.right && cy >= outer.top && cy <= outer.bottom;
	}

	function accept(id: ToyId): void {
		if (accepted[id]) return;
		accepted[id] = true;
		selected = null;
		sounds.clunk();
		const count = Object.values(accepted).filter(Boolean).length;
		if (count < TIDY_TOYS) {
			actions.tidyToy();
		} else {
			payMoment();
		}
	}

	/** The 3rd toy earns a short coin-payment beat before the scene moves on. */
	function payMoment(): void {
		if (advancing) return;
		advancing = true;
		paying = true;
		sounds.coin();
		speak(lines.tidyPaid(game.state));
		timer = setTimeout(() => actions.tidyToy(), 1600);
	}

	function onBoxTap(): void {
		if (paying) return;
		if (selected !== null && !accepted[selected]) accept(selected);
	}
</script>

<div class="scene tidy">
	<Bubble tail="center">The toys are all over the floor!</Bubble>

	<div class="tidy-stage">
		{#each TOYS as toy (toy.id)}
			<button
				type="button"
				class="toy"
				class:dragging={dragging === toy.id}
				class:selected={selected === toy.id}
				class:accepted={accepted[toy.id]}
				data-testid="toy-{toy.id}"
				aria-label="A toy to tidy up"
				style="left: min({toy.x}%, calc(100% - 122px)); top: {toy.y}%; --dx: {offsets[toy.id]
					.x}px; --dy: {offsets[toy.id].y}px"
				onpointerdown={(event) => onToyDown(event, toy.id)}
				onpointermove={(event) => onToyMove(event, toy.id)}
				onpointerup={(event) => onToyUp(event, toy.id)}
				onpointercancel={() => onToyCancel(toy.id)}
			>
				{#if toy.kind === 'ball'}
					<svg viewBox="0 0 80 80" aria-hidden="true">
						<circle cx="40" cy="40" r="33" fill="#ff8a66" />
						<path d="M10 30 Q40 48 70 30" fill="none" stroke="#fffdf8" stroke-width="7" />
						<path d="M18 58 Q40 70 62 58" fill="none" stroke="#ffd35c" stroke-width="7" />
						<circle cx="28" cy="26" r="6" fill="#fffdf8" opacity="0.85" />
					</svg>
				{:else if toy.kind === 'blocks'}
					<svg viewBox="0 0 80 80" aria-hidden="true">
						<rect x="10" y="38" width="36" height="36" rx="9" fill="#bfe3f5" stroke="#4a3728" stroke-width="3" />
						<rect x="38" y="12" width="32" height="32" rx="9" fill="#ffd35c" stroke="#4a3728" stroke-width="3" />
						<circle cx="54" cy="28" r="7" fill="#fffdf8" opacity="0.9" />
					</svg>
				{:else}
					<svg viewBox="0 0 80 80" aria-hidden="true">
						<circle cx="22" cy="24" r="10" fill="#d9a869" />
						<circle cx="58" cy="24" r="10" fill="#d9a869" />
						<circle cx="40" cy="46" r="26" fill="#d9a869" />
						<ellipse cx="40" cy="52" rx="14" ry="11" fill="#f4dcc0" />
						<circle cx="31" cy="40" r="4" fill="#4a3728" />
						<circle cx="49" cy="40" r="4" fill="#4a3728" />
						<path d="M35 53 Q40 57 45 53" fill="none" stroke="#4a3728" stroke-width="3" stroke-linecap="round" />
					</svg>
				{/if}
			</button>
		{/each}

		{#if paying}
			<div class="pay-moment" aria-hidden="true">
				<Coin size={64} />
				<Coin size={46} />
				<span class="pay-plus">+{TIDY_REWARD}</span>
			</div>
		{/if}

		<button
			type="button"
			class="tidy-box"
			class:open={selected !== null || dragging !== null}
			data-testid="tidy-box"
			bind:this={boxEl}
			onclick={onBoxTap}
			aria-label="The toy box"
		>
			<span class="box-back" aria-hidden="true"></span>
			<span class="box-contents" aria-hidden="true">
				{#each TOYS as toy (toy.id)}
					{#if accepted[toy.id]}
						<span class="box-blob blob-{toy.kind}"></span>
					{/if}
				{/each}
			</span>
			<span class="box-front" aria-hidden="true"></span>
		</button>
	</div>
</div>

<style>
	.tidy-stage {
		position: relative;
		width: 100%;
		max-width: 480px;
		height: min(58vh, 430px);
		min-height: 360px;
	}

	.toy {
		position: absolute;
		width: 108px;
		height: 108px;
		padding: 8px;
		border: none;
		background: transparent;
		cursor: grab;
		touch-action: none;
		transform: translate(var(--dx), var(--dy));
		transition: transform 0.22s ease, scale 0.15s ease;
		filter: drop-shadow(0 8px 10px rgba(74, 55, 40, 0.18));
	}

	.toy svg {
		width: 100%;
		height: 100%;
	}

	.toy.dragging {
		cursor: grabbing;
		z-index: 6;
		scale: 1.15;
		transition: none;
	}

	.toy.selected {
		scale: 1.12;
		z-index: 5;
		filter: drop-shadow(0 0 0 5px rgba(191, 227, 245, 0.9)) drop-shadow(0 10px 12px rgba(74, 55, 40, 0.2));
		animation: selected-wiggle 0.9s ease-in-out infinite;
	}

	.toy.accepted {
		pointer-events: none;
		animation: toy-in-box 0.5s ease-in forwards;
	}

	@keyframes toy-in-box {
		to {
			scale: 0.1;
			opacity: 0;
		}
	}

	@keyframes selected-wiggle {
		50% {
			translate: 0 -8px;
		}
	}

	.tidy-box {
		position: absolute;
		left: 50%;
		bottom: 0;
		translate: -50% 0;
		width: min(300px, 82vw);
		height: 138px;
		border: none;
		background: transparent;
		padding: 0;
		cursor: pointer;
	}

	.box-back {
		position: absolute;
		inset: 0 0 26px 0;
		border-radius: 26px 26px 12px 12px;
		background: linear-gradient(180deg, #d9a869, #c08b4f);
		box-shadow: inset 0 8px 0 rgba(255, 255, 255, 0.18), inset 0 -10px 0 rgba(74, 55, 40, 0.16);
	}

	.box-front {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		height: 74px;
		border-radius: 12px 12px 26px 26px;
		background: linear-gradient(180deg, #e0b477, #c89454);
		box-shadow: inset 0 6px 0 rgba(255, 255, 255, 0.16);
	}

	.tidy-box.open .box-back {
		box-shadow: inset 0 0 0 6px rgba(191, 227, 245, 0.9), inset 0 8px 0 rgba(255, 255, 255, 0.18),
			inset 0 -10px 0 rgba(74, 55, 40, 0.16);
	}

	.box-contents {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 58px;
		display: flex;
		align-items: flex-end;
		justify-content: center;
		gap: 10px;
	}

	.box-blob {
		display: block;
		width: 46px;
		height: 40px;
		border-radius: 14px 14px 10px 10px;
	}

	.blob-ball {
		background: #ff8a66;
		border-radius: 50%;
	}
	.blob-blocks {
		background: #ffd35c;
	}
	.blob-teddy {
		background: #d9a869;
		border-radius: 50% 50% 16px 16px;
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

	.pay-moment :global(svg:nth-child(2)) {
		margin-top: 22px;
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

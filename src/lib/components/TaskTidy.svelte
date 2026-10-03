<script lang="ts">
	import { TIDY_REWARD, TIDY_TOYS } from '$lib/game/economy';
	import { flyCoins, hudCoinPoint } from '$lib/game/flights.svelte';
	import { actions, game } from '$lib/game/game.svelte';
	import { lines } from '$lib/game/lines';
	import { spoken } from '$lib/game/spoken';
	import { speakFragments } from '$lib/game/speech';
	import { sounds } from '$lib/game/sounds';
	import { toast } from '$lib/game/toasts.svelte';
	import { pickTidyToys, type TidyKind } from '$lib/game/tidyPool';
	import Bubble from './Bubble.svelte';
	import Coin from './Coin.svelte';

	type ToyId = 0 | 1 | 2;

	/** Where each scattered toy lands, in toy-0..2 order. */
	const SPOTS = [
		{ x: 8, y: 16 },
		{ x: 56, y: 6 },
		{ x: 32, y: 40 }
	] as const;

	/**
	 * The day's trio, seeded by the day alone: the same three all day long.
	 * Zipped over SPOTS, so the spot list is the length source: a trio that
	 * outgrew the spots is trimmed rather than indexed past their end (which
	 * used to throw), and a shrunken one renders only the toys it has. The
	 * dev note makes a drift between TIDY_TOYS and SPOTS loud while it is
	 * still a code change, not a broken room. The payout still counts
	 * TIDY_TOYS, though: a `TIDY_TOYS` larger than SPOTS would render but
	 * never finish.
	 */
	const TOYS: { id: ToyId; kind: TidyKind; x: number; y: number }[] = (() => {
		const trio = pickTidyToys(game.state.day);
		if (import.meta.env.DEV && trio.length !== SPOTS.length) {
			console.warn(`TaskTidy: ${trio.length} tidy toys scattered for ${SPOTS.length} spots`);
		}
		return SPOTS.flatMap((spot, index) => {
			const kind = trio[index];
			return kind === undefined ? [] : [{ id: index as ToyId, kind, x: spot.x, y: spot.y }];
		});
	})();

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
		speakFragments(spoken.tidy(game.state));
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
		speakFragments(spoken.tidyPaid(game.state));
		toast(lines.tidyPaid(game.state));
		const rect = boxEl?.getBoundingClientRect();
		flyCoins({
			from: rect
				? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
				: { x: innerWidth / 2, y: innerHeight / 2 },
			to: hudCoinPoint(),
			count: TIDY_REWARD
		});
		timer = setTimeout(() => actions.tidyToy(), 1600);
	}

	function onBoxTap(): void {
		if (paying) return;
		if (selected !== null && !accepted[selected]) accept(selected);
	}
</script>

<div class="scene tidy">
	<div class="task-head">
		<Bubble tail="center">{lines.tidy(game.state)}</Bubble>
		<span class="price-tag" data-testid="price-tag-tidy" aria-label="Pays {TIDY_REWARD} coins">
			<Coin size={24} />{TIDY_REWARD}
		</span>
	</div>

	<div class="tidy-stage">
		{#each TOYS as toy (toy.id)}
			<button
				type="button"
				class="toy"
				class:dragging={dragging === toy.id}
				class:selected={selected === toy.id}
				class:accepted={accepted[toy.id]}
				data-testid="toy-{toy.id}"
				data-kind={toy.kind}
				aria-label="Toy {toy.id + 1} of {TOYS.length} to tidy up"
				aria-disabled={accepted[toy.id] ? 'true' : undefined}
				tabindex={accepted[toy.id] ? -1 : undefined}
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
				{:else if toy.kind === 'teddy'}
					<svg viewBox="0 0 80 80" aria-hidden="true">
						<circle cx="22" cy="24" r="10" fill="#d9a869" />
						<circle cx="58" cy="24" r="10" fill="#d9a869" />
						<circle cx="40" cy="46" r="26" fill="#d9a869" />
						<ellipse cx="40" cy="52" rx="14" ry="11" fill="#f4dcc0" />
						<circle cx="31" cy="40" r="4" fill="#4a3728" />
						<circle cx="49" cy="40" r="4" fill="#4a3728" />
						<path d="M35 53 Q40 57 45 53" fill="none" stroke="#4a3728" stroke-width="3" stroke-linecap="round" />
					</svg>
				{:else if toy.kind === 'drum'}
					<svg viewBox="0 0 80 80" aria-hidden="true">
						<circle cx="24" cy="10" r="6" fill="#ffd35c" stroke="#4a3728" stroke-width="3" />
						<path d="M28 15 L44 31" fill="none" stroke="#d9a869" stroke-width="7" stroke-linecap="round" />
						<rect x="12" y="22" width="56" height="46" rx="14" fill="#ff8a66" stroke="#4a3728" stroke-width="3" />
						<ellipse cx="40" cy="23" rx="28" ry="9" fill="#f4dcc0" stroke="#4a3728" stroke-width="3" />
						<path d="M16 40 Q40 48 64 40" fill="none" stroke="#ffd35c" stroke-width="6" />
						<path d="M17 56 Q40 63 63 56" fill="none" stroke="#fffdf8" stroke-width="6" />
					</svg>
				{:else if toy.kind === 'boat'}
					<svg viewBox="0 0 80 80" aria-hidden="true">
						<path d="M41 10 V47" fill="none" stroke="#4a3728" stroke-width="3" stroke-linecap="round" />
						<path d="M45 15 L64 40 L45 40 Z" fill="#bfe3f5" stroke="#4a3728" stroke-width="3" stroke-linejoin="round" />
						<path d="M37 19 L22 40 L37 40 Z" fill="#fffdf8" stroke="#4a3728" stroke-width="3" stroke-linejoin="round" />
						<path d="M10 45 Q40 51 70 45 L59 63 Q40 70 21 63 Z" fill="#ff8a66" stroke="#4a3728" stroke-width="3" stroke-linejoin="round" />
						<path d="M19 51 Q40 57 61 51" fill="none" stroke="#ffd35c" stroke-width="5" />
						<path d="M8 73 Q17 67 26 73 T44 73 T62 73" fill="none" stroke="#bfe3f5" stroke-width="5" stroke-linecap="round" />
					</svg>
				{:else}
					<svg viewBox="0 0 80 80" aria-hidden="true">
						<rect x="10" y="45" width="9" height="21" rx="4.5" fill="#bfe3f5" stroke="#4a3728" stroke-width="3" />
						<rect x="61" y="45" width="9" height="21" rx="4.5" fill="#bfe3f5" stroke="#4a3728" stroke-width="3" />
						<rect x="26" y="70" width="10" height="7" rx="3.5" fill="#bfe3f5" stroke="#4a3728" stroke-width="3" />
						<rect x="44" y="70" width="10" height="7" rx="3.5" fill="#bfe3f5" stroke="#4a3728" stroke-width="3" />
						<path d="M40 9 V16" fill="none" stroke="#4a3728" stroke-width="3" stroke-linecap="round" />
						<circle cx="40" cy="7" r="5" fill="#ff8a66" stroke="#4a3728" stroke-width="3" />
						<rect x="18" y="14" width="44" height="27" rx="11" fill="#bfe3f5" stroke="#4a3728" stroke-width="3" />
						<circle cx="31" cy="27" r="4.5" fill="#4a3728" />
						<circle cx="49" cy="27" r="4.5" fill="#4a3728" />
						<path d="M33 34 Q40 38 47 34" fill="none" stroke="#4a3728" stroke-width="3" stroke-linecap="round" />
						<rect x="21" y="41" width="38" height="31" rx="12" fill="#f4dcc0" stroke="#4a3728" stroke-width="3" />
						<circle cx="32" cy="52" r="3.5" fill="#ff8a66" />
						<circle cx="40" cy="52" r="3.5" fill="#ffd35c" />
						<circle cx="48" cy="52" r="3.5" fill="#bfe3f5" />
						<rect x="31" y="60" width="18" height="9" rx="4.5" fill="#d9a869" stroke="#4a3728" stroke-width="3" />
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
	.blob-drum {
		background: #ff8a66;
		border-radius: 8px 8px 14px 14px;
	}
	.blob-boat {
		background: #bfe3f5;
		border-radius: 8px 8px 18px 18px;
	}
	.blob-robot {
		background: #f4dcc0;
		border-radius: 12px;
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

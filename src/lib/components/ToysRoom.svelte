<script lang="ts">
	import { TOY_LABELS, type ToyId } from '$lib/game/economy';
	import { game } from '$lib/game/game.svelte';
	import { lines } from '$lib/game/lines';
	import { speak } from '$lib/game/speech';
	import GoalItem from './GoalItem.svelte';

	/**
	 * The room behind the title's "My Toys" door. Owned toys sit on the rug,
	 * in acquisition order; the ball opens its mini-game. Nothing here touches
	 * the engine — the room is pure UI, so a visit can never change the save.
	 */

	type Props = {
		/** The toys a child owns, in acquisition order. */
		items: ToyId[];
		/** Open an owned toy's mini-game (slice 1: the ball alone). */
		onplay: (id: ToyId) => void;
		/** The house button: back to the title screen. */
		onexit: () => void;
	};

	let { items, onplay, onexit }: Props = $props();

	/** A tap on a toy whose game is still coming (slice 2) makes it hop. */
	let tapped = $state<ToyId | null>(null);
	let hops = $state(0);

	let spoke = $state(false);
	$effect(() => {
		if (spoke || items.length > 0) return;
		spoke = true;
		speak(lines.toysEmpty(game.state));
	});

	function tapToy(id: ToyId): void {
		if (id === 'ball') {
			onplay(id);
			return;
		}
		tapped = id;
		hops += 1;
	}
</script>

<div class="toys-room" data-testid="toys-room">
	<button
		type="button"
		class="room-exit"
		data-testid="toys-exit"
		aria-label="Back to my Money Day"
		onclick={onexit}
	>
		<svg width="34" height="34" viewBox="0 0 40 40" aria-hidden="true">
			<path
				d="M6 19 L20 7 L34 19"
				fill="none"
				stroke="#4a3728"
				stroke-width="4"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
			<path
				d="M11 16.5 V33 H29 V16.5"
				fill="#ffd35c"
				stroke="#4a3728"
				stroke-width="4"
				stroke-linejoin="round"
			/>
			<rect x="17.5" y="24" width="5" height="9" rx="2" fill="#4a3728" />
		</svg>
	</button>

	<div class="room-rug">
		{#each items as id (id)}
			<button
				type="button"
				class="room-toy"
				data-testid="toy-{id}"
				aria-label={TOY_LABELS[id]}
				onclick={() => tapToy(id)}
			>
				{#key tapped === id ? hops : 0}
					<span class="toy-art" class:wiggle={tapped === id}>
						<GoalItem kind={id} size={104} />
					</span>
				{/key}
			</button>
		{:else}
			<div class="room-empty" data-testid="toys-empty">
				<span class="empty-slot" aria-hidden="true"></span>
				<p class="empty-hint">{lines.toysEmpty(game.state)}</p>
			</div>
		{/each}
	</div>
</div>

<style>
	.toys-room {
		position: fixed;
		inset: 0;
		z-index: 60;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 24px;
		background:
			radial-gradient(rgba(74, 55, 40, 0.06) 1.5px, transparent 1.6px),
			linear-gradient(180deg, #ddf2fc 0%, #fff6e5 58%, #ffe9c9 100%);
		background-size: 30px 30px, auto;
		animation: scene-in 0.4s ease both;
	}

	.room-exit {
		position: absolute;
		top: max(14px, env(safe-area-inset-top, 0px));
		left: 14px;
		z-index: 5;
		width: 68px;
		height: 68px;
		border: none;
		border-radius: 50%;
		background: rgba(255, 253, 248, 0.9);
		box-shadow:
			0 4px 0 rgba(74, 55, 40, 0.12),
			0 10px 20px rgba(74, 55, 40, 0.12);
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
	}

	.room-exit:active {
		transform: scale(0.94);
	}

	.room-exit:focus-visible {
		outline: 4px solid var(--sky);
		outline-offset: 2px;
	}

	.room-rug {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		gap: 10px;
		width: min(470px, 94vw);
		min-height: 240px;
		padding: 26px 20px;
		border-radius: 40px;
		background:
			repeating-linear-gradient(
				90deg,
				rgba(255, 138, 102, 0.16) 0 22px,
				rgba(255, 253, 248, 0.5) 22px 44px
			),
			#fff1dc;
		box-shadow:
			inset 0 -8px 0 rgba(74, 55, 40, 0.08),
			0 18px 34px rgba(74, 55, 40, 0.16);
	}

	.room-toy {
		width: 132px;
		height: 132px;
		border: none;
		border-radius: 32px;
		background: transparent;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: transform 0.14s ease;
	}

	.room-toy:active {
		transform: scale(0.92);
	}

	.room-toy:focus-visible {
		outline: 4px solid var(--sky);
		outline-offset: 2px;
	}

	.toy-art {
		display: block;
	}

	.room-empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 16px;
		width: 100%;
	}

	.empty-slot {
		width: 116px;
		height: 116px;
		border-radius: 34px;
		border: 4px dashed rgba(74, 55, 40, 0.22);
	}

	.empty-hint {
		margin: 0;
		max-width: 300px;
		text-align: center;
		font-size: 20px;
		font-weight: 500;
		color: var(--ink-soft);
	}
</style>
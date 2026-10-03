<script lang="ts">
	import { TOY_LABELS, type ToyId } from '$lib/game/economy';
	import { game } from '$lib/game/game.svelte';
	import { lines } from '$lib/game/lines';
	import { spoken } from '$lib/game/spoken';
	import { speakFragments } from '$lib/game/speech';
	import GoalItem from './GoalItem.svelte';
	import HouseButton from './HouseButton.svelte';

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
		/** A scene sits on top: the room must take neither input nor focus. */
		covered?: boolean;
	};

	let { items, onplay, onexit, covered = false }: Props = $props();

	/** The tile mid-hop, by rug position — so each repeated toy hops alone. */
	let tapped = $state<number | null>(null);
	let hops = $state(0);

	let house = $state<ReturnType<typeof HouseButton> | undefined>();

	// Keyboard entry: the house takes focus when the room opens, and gets it
	// back when a mini-game sitting on top of the room closes.
	$effect(() => {
		if (!covered) house?.focus();
	});

	let spoke = $state(false);
	$effect(() => {
		if (spoke || items.length > 0) return;
		spoke = true;
		speakFragments(spoken.toysEmpty(game.state));
	});

	function tapToy(id: ToyId, index: number): void {
		if (id === 'ball') {
			onplay(id);
			return;
		}
		tapped = index;
		hops += 1;
	}

	/** A repeated toy gets its copy number; a lone one keeps its plain name. */
	function tileLabel(id: ToyId, index: number): string {
		const copies = items.filter((item) => item === id).length;
		if (copies <= 1) return TOY_LABELS[id];
		const copy = items.slice(0, index + 1).filter((item) => item === id).length;
		return `${TOY_LABELS[id]} (${copy})`;
	}
</script>

<div class="toys-room" data-testid="toys-room" inert={covered}>
	<HouseButton
		testid="toys-exit"
		label="Back to my Money Day"
		onexit={onexit}
		bind:this={house}
	/>

	<div class="room-rug">
		<!-- Keyed by position, not by id: the dream list cycles, so `owned`
		     can hold the same toy twice — each acquisition is a real object
		     and must get its own tile (the unit suite asserts the cycle). -->
		{#each items as id, i (i)}
			<button
				type="button"
				class="room-toy"
				data-testid="toy-{id}"
				data-index={i}
				aria-label={tileLabel(id, i)}
				onclick={() => tapToy(id, i)}
			>
				{#key tapped === i ? hops : 0}
					<span class="toy-art" class:wiggle={tapped === i}>
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

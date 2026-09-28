<script lang="ts">
	/**
	 * The house: one tap back out of a play scene. Extracted from the room and
	 * the mini-game, where the SVG and CSS had been verbatim twins.
	 */

	type Props = {
		/** The caller's existing testid — specs address it unchanged. */
		testid: string;
		/** What the button announces; scene-specific. */
		label: string;
		onexit: () => void;
	};

	let { testid, label, onexit }: Props = $props();

	let button: HTMLButtonElement | undefined = $state();

	/** Focus the house — play scenes call this when they open. */
	export function focus(): void {
		button?.focus();
	}
</script>

<button
	type="button"
	class="house-button"
	data-testid={testid}
	aria-label={label}
	bind:this={button}
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

<style>
	.house-button {
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

	.house-button:active {
		transform: scale(0.94);
	}

	.house-button:focus-visible {
		outline: 4px solid var(--sky);
		outline-offset: 2px;
	}
</style>

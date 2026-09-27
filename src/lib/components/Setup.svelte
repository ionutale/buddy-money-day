<script lang="ts">
	import { actions, game } from '$lib/game/game.svelte';
	import { lines } from '$lib/game/lines';
	import { speak } from '$lib/game/speech';
	import Buddy from './Buddy.svelte';

	type Props = {
		/** 'name' is first-run entry; 'reset' is the gear-opened grown-up card. */
		mode?: 'name' | 'reset';
		onclose?: (() => void) | null;
	};

	let { mode = 'name', onclose = null }: Props = $props();

	let name = $state('');
	let confirming = $state(false);
	let nameInput: HTMLInputElement | undefined = $state();
	let confirmButton: HTMLButtonElement | undefined = $state();

	let spoke = $state(false);
	$effect(() => {
		if (spoke) return;
		spoke = true;
		speak(lines.setup(game.state));
	});

	$effect(() => {
		if (mode === 'name') nameInput?.focus({ preventScroll: true });
	});

	$effect(() => {
		if (confirming) confirmButton?.focus({ preventScroll: true });
	});

	function submit(): void {
		actions.submitName(name);
	}

	function onKeydown(event: KeyboardEvent): void {
		if (event.key === 'Enter') submit();
	}

	function confirmReset(): void {
		confirming = false;
		actions.reset();
	}

	function backdropClick(event: MouseEvent): void {
		if (event.target === event.currentTarget) confirming = false;
	}

	function onWindowKeydown(event: KeyboardEvent): void {
		if (event.key !== 'Escape') return;
		if (confirming) confirming = false;
		else if (mode === 'reset' && onclose) onclose();
	}
</script>

<svelte:window onkeydown={onWindowKeydown} />

{#if mode === 'name'}
	<div class="scene setup">
		<div class="setup-card card">
			<Buddy mood="happy" size={116} />
			<h1 class="setup-title">Grown-up Setup</h1>
			<p class="setup-copy">
				What should Buddy call your child? The name stays on this phone and is only ever spoken
				aloud.
			</p>
			<input
				class="name-input"
				data-testid="name-input"
				bind:this={nameInput}
				bind:value={name}
				maxlength="24"
				placeholder="Name"
				autocomplete="off"
				enterkeyhint="done"
				aria-label="Your child's name"
				onkeydown={onKeydown}
			/>
			<button type="button" class="btn btn-primary btn-huge" data-testid="name-submit" onclick={submit}>
				Let's go!
			</button>
			<button type="button" class="btn btn-ghost" data-testid="name-skip" onclick={() => actions.skipName()}>
				Skip for now
			</button>
		</div>
	</div>
{:else}
	<div class="overlay" role="presentation" onclick={backdropClick}>
		<div class="setup-card card">
			<h1 class="setup-title">Grown-up Setup</h1>
			<p class="setup-copy">
				Buddy's jar, home, and every saved coin live on this phone only. Starting over erases
				them, and Buddy will greet you fresh.
			</p>
			<button
				type="button"
				class="btn btn-coral"
				data-testid="reset-game-button"
				onclick={() => (confirming = true)}
			>
				Start over
			</button>
			{#if onclose}
				<button type="button" class="btn btn-ghost" onclick={onclose}>Keep playing</button>
			{/if}
		</div>

		{#if confirming}
			<div class="modal-backdrop" role="presentation" onclick={backdropClick}>
				<div class="modal card" role="alertdialog" aria-modal="true" aria-labelledby="reset-title">
					<h2 id="reset-title" class="setup-title">Start over?</h2>
					<p class="setup-copy">
						Buddy's jar, home, and every saved coin on this phone will be gone. Buddy will still
						be happy to see you.
					</p>
					<button
						type="button"
						class="btn btn-coral"
						data-testid="reset-confirm"
						bind:this={confirmButton}
						onclick={confirmReset}
					>
						Yes, start over
					</button>
					<button type="button" class="btn btn-ghost" data-testid="reset-cancel" onclick={() => (confirming = false)}>
						Keep playing
					</button>
				</div>
			</div>
		{/if}
	</div>
{/if}

<style>
	.setup-card {
		width: min(430px, 100%);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 16px;
		text-align: center;
		padding: 28px 24px 30px;
	}

	.setup-title {
		margin: 0;
		font-size: 28px;
		font-weight: 700;
	}

	.setup-copy {
		margin: 0;
		font-size: 17px;
		line-height: 1.4;
		color: var(--ink-soft);
	}

	.name-input {
		width: 100%;
		min-height: 78px;
		border-radius: 26px;
		border: 3px solid rgba(74, 55, 40, 0.18);
		background: #fff;
		padding: 0 22px;
		font-size: 27px;
		font-weight: 600;
		text-align: center;
		box-shadow: inset 0 4px 0 rgba(74, 55, 40, 0.06);
	}

	.name-input:focus-visible {
		outline: none;
		border-color: #7cbcd9;
		box-shadow: 0 0 0 6px rgba(191, 227, 245, 0.55);
	}

	.overlay {
		position: fixed;
		inset: 0;
		z-index: 60;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 22px;
		background: rgba(74, 55, 40, 0.38);
		backdrop-filter: blur(3px);
		animation: fade-in 0.25s ease both;
	}

	.modal-backdrop {
		position: fixed;
		inset: 0;
		z-index: 70;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 22px;
		background: rgba(74, 55, 40, 0.45);
		animation: fade-in 0.2s ease both;
	}

	.modal {
		width: min(420px, 100%);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 16px;
		text-align: center;
		padding: 28px 24px;
		animation: modal-pop 0.3s cubic-bezier(0.2, 1.4, 0.4, 1) both;
	}

	@keyframes fade-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@keyframes modal-pop {
		from {
			opacity: 0;
			transform: scale(0.85);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}
</style>

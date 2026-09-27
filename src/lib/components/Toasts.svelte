<script lang="ts">
	import { toasts } from '$lib/game/toasts.svelte';
</script>

{#each toasts.items as item (item.id)}
	<div class="toast-chip pop-in" data-testid="goal-toast" role="status">{item.text}</div>
{/each}

<style>
	.toast-chip {
		position: fixed;
		left: 50%;
		translate: -50% 0;
		bottom: calc(16px + env(safe-area-inset-bottom, 0px));
		z-index: 95;
		max-width: min(420px, 86vw);
		background: rgba(255, 253, 248, 0.97);
		color: var(--ink);
		border-radius: 20px;
		padding: 12px 18px;
		font-size: 17px;
		font-weight: 600;
		text-align: center;
		box-shadow:
			0 8px 0 rgba(74, 55, 40, 0.08),
			0 14px 30px rgba(74, 55, 40, 0.18);
		pointer-events: none;
	}
</style>

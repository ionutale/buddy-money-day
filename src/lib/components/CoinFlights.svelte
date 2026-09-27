<script lang="ts">
	import { flights } from '$lib/game/flights.svelte';
</script>

<!-- Fixed overlay: coin hops for earns, saves, and spends. Never blocks taps. -->
<div class="flight-layer" aria-hidden="true">
	{#each flights.active as flight (flight.id)}
		{#each flight.delays as delay, index (index)}
			<span
				class="flying-coin"
				style="left: {flight.from.x}px; top: {flight.from.y}px; --dx: {flight.to.x -
					flight.from.x}px; --dy: {flight.to.y - flight.from.y}px; animation-delay: {delay}ms"
			></span>
		{/each}
	{/each}
</div>

<style>
	.flight-layer {
		position: fixed;
		inset: 0;
		z-index: 90;
		pointer-events: none;
		overflow: hidden;
	}

	.flying-coin {
		position: absolute;
		width: 26px;
		height: 26px;
		margin: -13px 0 0 -13px;
		border-radius: 50%;
		background: radial-gradient(circle at 35% 30%, #fff3c4, #ffd35c 60%, #e8a93a);
		box-shadow: inset 0 0 0 3px rgba(74, 55, 40, 0.35);
		animation: coin-hop 640ms cubic-bezier(0.3, 0.8, 0.4, 1) both;
	}

	@keyframes coin-hop {
		0% {
			translate: 0 0;
			scale: 0.7;
			opacity: 0;
		}
		15% {
			opacity: 1;
		}
		60% {
			translate: calc(var(--dx) * 0.6) calc(var(--dy) * 0.45 - 40px);
			scale: 1;
		}
		100% {
			translate: var(--dx) var(--dy);
			scale: 0.8;
			opacity: 0.9;
		}
	}
</style>

<script lang="ts">
	import { GOAL_COST } from '$lib/game/economy';

	type Props = {
		/** Coins currently in the jar. */
		fill?: number;
		/** Coins the current Goal costs. */
		capacity?: number;
		size?: number;
	};

	let { fill = 0, capacity = GOAL_COST, size = 140 }: Props = $props();
	const uid = $props.id();

	const safe = $derived(capacity > 0 ? capacity : 1);
	const pct = $derived(Math.min(1, Math.max(0, fill / safe)));
	const levelY = $derived(128 - pct * 86);
	const full = $derived(fill >= safe);
</script>

<!-- The Save Jar: glass, cork, and a golden coin level. -->
<svg
	class="jar"
	style="--jar-size: {size}px"
	viewBox="0 0 120 150"
	role="img"
	aria-label="{fill} coins in the Save Jar"
>
	<defs>
		<linearGradient id="jar-coins-{uid}" x1="0" y1="0" x2="0" y2="1">
			<stop offset="0%" stop-color="#ffe9a8" />
			<stop offset="100%" stop-color="#e8a93a" />
		</linearGradient>
		<linearGradient id="jar-glass-{uid}" x1="0" y1="0" x2="1" y2="0">
			<stop offset="0%" stop-color="#e6f5fc" />
			<stop offset="55%" stop-color="#cfeaf8" />
			<stop offset="100%" stop-color="#bfe3f5" />
		</linearGradient>
		<clipPath id="jar-interior-{uid}">
			<path d="M46 30 L46 44 Q24 52 24 76 L24 118 Q24 138 44 138 L76 138 Q96 138 96 118 L96 76 Q96 52 74 44 L74 30 Z" />
		</clipPath>
	</defs>

	<!-- cork -->
	<rect x="52" y="4" width="16" height="12" rx="6" fill="#d9a869" />
	<rect x="38" y="13" width="44" height="18" rx="9" fill="#ffd35c" stroke="#e8a93a" stroke-width="3" />

	<!-- glass body -->
	<path
		d="M46 30 L46 44 Q24 52 24 76 L24 118 Q24 138 44 138 L76 138 Q96 138 96 118 L96 76 Q96 52 74 44 L74 30 Z"
		fill="url(#jar-glass-{uid})"
		stroke="#8fb8cc"
		stroke-width="3"
	/>

	<!-- coins -->
	{#if fill > 0}
		<g clip-path="url(#jar-interior-{uid})">
			<rect x="20" y={levelY} width="80" height={150 - levelY} fill="url(#jar-coins-{uid})" />
			<circle cx="38" cy={levelY} r="10" fill="#ffd35c" stroke="#e8a93a" stroke-width="2.5" />
			<circle cx="58" cy={levelY} r="10" fill="#ffd35c" stroke="#e8a93a" stroke-width="2.5" />
			<circle cx="78" cy={levelY} r="10" fill="#ffd35c" stroke="#e8a93a" stroke-width="2.5" />
			<circle cx="48" cy={levelY + 12} r="10" fill="#ffe9a8" stroke="#e8a93a" stroke-width="2.5" />
			<circle cx="68" cy={levelY + 12} r="10" fill="#ffe9a8" stroke="#e8a93a" stroke-width="2.5" />
		</g>
	{/if}

	<!-- glass shine -->
	<path d="M35 62 Q31 92 35 122" fill="none" stroke="#fffdf8" stroke-width="7" stroke-linecap="round" opacity="0.7" />

	<!-- a Goal's worth of coins gets a sparkle -->
	{#if full}
		<path class="jar-sparkle" d="M92 34 l3.4 8.4 8.4 3.4 -8.4 3.4 -3.4 8.4 -3.4-8.4 -8.4-3.4 8.4-3.4 z" fill="#ffd35c" />
		<path class="jar-sparkle jar-sparkle-late" d="M26 44 l2.4 6 6 2.4 -6 2.4 -2.4 6 -2.4-6 -6-2.4 6-2.4 z" fill="#ff8a66" />
	{/if}
</svg>

<style>
	.jar {
		width: var(--jar-size);
		height: auto;
		filter: drop-shadow(0 8px 14px rgba(74, 55, 40, 0.16));
	}

	.jar-sparkle {
		transform-box: fill-box;
		transform-origin: center;
		animation: jar-twinkle 1.8s ease-in-out infinite;
	}
	.jar-sparkle-late {
		animation-delay: 0.7s;
	}
	@keyframes jar-twinkle {
		0%,
		100% {
			opacity: 0.45;
			transform: scale(0.75) rotate(0deg);
		}
		50% {
			opacity: 1;
			transform: scale(1.05) rotate(16deg);
		}
	}
</style>

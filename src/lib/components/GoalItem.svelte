<script lang="ts">
	import type { GoalId } from '$lib/game/economy';

	type Props = {
		kind: GoalId;
		size?: number;
	};

	let { kind, size = 96 }: Props = $props();
	const uid = $props.id();

	const ink = '#4a3728';
</script>

<!-- The three Goal items, drawn as storybook toys. -->
<svg
	class="goal-item"
	style="--item-size: {size}px"
	viewBox="0 0 120 120"
	role="img"
	aria-label={kind}
>
	{#if kind === 'kite'}
		<!-- tail -->
		<path d="M60 88 C 46 96, 74 102, 56 116" fill="none" stroke={ink} stroke-width="3" stroke-linecap="round" />
		<rect x="-5" y="-5" width="10" height="10" rx="2" fill="#ff8a66" stroke={ink} stroke-width="2" transform="translate(52 100) rotate(45)" />
		<rect x="-5" y="-5" width="10" height="10" rx="2" fill="#ffd35c" stroke={ink} stroke-width="2" transform="translate(64 107) rotate(45)" />
		<rect x="-5" y="-5" width="10" height="10" rx="2" fill="#8ed4c0" stroke={ink} stroke-width="2" transform="translate(53 115) rotate(45)" />
		<!-- diamond -->
		<path d="M60 6 L60 54 L16 54 Z" fill="#ff8a66" />
		<path d="M60 6 L104 54 L60 54 Z" fill="#ffd35c" />
		<path d="M60 54 L60 92 L16 54 Z" fill="#ffd35c" />
		<path d="M60 54 L104 54 L60 92 Z" fill="#8ed4c0" />
		<path d="M60 6 L104 54 L60 92 L16 54 Z" fill="none" stroke={ink} stroke-width="4" stroke-linejoin="round" />
		<path d="M60 6 L60 92 M16 54 L104 54" stroke={ink} stroke-width="2.5" opacity="0.45" />
	{:else if kind === 'hat'}
		<!-- funny party hat -->
		<path d="M30 94 L60 12 L90 94 Z" fill="#ffd35c" stroke={ink} stroke-width="4" stroke-linejoin="round" />
		<path d="M40 66 Q60 60 80 66 L85 80 Q60 73 35 80 Z" fill="#ff8a66" />
		<path d="M49 42 Q60 38 71 42 L74 50 Q60 46 46 50 Z" fill="#8ed4c0" />
		<circle cx="60" cy="12" r="11" fill="#ff8a66" stroke={ink} stroke-width="4" />
		<ellipse cx="60" cy="96" rx="40" ry="12" fill="#8ed4c0" stroke={ink} stroke-width="4" />
		<circle cx="52" cy="26" r="3" fill="#fffdf8" opacity="0.9" />
	{:else}
		<!-- little slide -->
		<ellipse cx="60" cy="106" rx="46" ry="11" fill="#9ad29a" />
		<rect x="22" y="32" width="8" height="70" rx="4" fill="#bfe3f5" stroke={ink} stroke-width="3" />
		<rect x="44" y="32" width="8" height="70" rx="4" fill="#bfe3f5" stroke={ink} stroke-width="3" />
		<rect x="24" y="50" width="26" height="7" rx="3.5" fill="#fffdf8" stroke={ink} stroke-width="3" />
		<rect x="24" y="68" width="26" height="7" rx="3.5" fill="#fffdf8" stroke={ink} stroke-width="3" />
		<rect x="24" y="86" width="26" height="7" rx="3.5" fill="#fffdf8" stroke={ink} stroke-width="3" />
		<rect x="18" y="22" width="44" height="13" rx="6.5" fill="#ffd35c" stroke={ink} stroke-width="3" />
		<path d="M50 27 Q90 36 99 96" fill="none" stroke="#ff8a66" stroke-width="15" stroke-linecap="round" />
		<path d="M50 27 Q90 36 99 96" fill="none" stroke={ink} stroke-width="3" stroke-linecap="round" opacity="0.3" />
		<circle cx="99" cy="99" r="7" fill="#ff8a66" />
	{/if}
</svg>

<style>
	.goal-item {
		width: var(--item-size);
		height: auto;
		filter: drop-shadow(0 8px 12px rgba(74, 55, 40, 0.16));
	}
</style>

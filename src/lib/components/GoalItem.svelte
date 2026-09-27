<script lang="ts">
	import { TOY_LABELS, type ToyId } from '$lib/game/economy';

	type Props = {
		kind: ToyId;
		size?: number;
	};

	let { kind, size = 96 }: Props = $props();

	// Placeholder toy art (Task 6 brings the real storybook wagon and teddy).
	const ink = '#4a3728';
</script>

<svg
	class="goal-item"
	style="--item-size: {size}px"
	viewBox="0 0 120 120"
	role="img"
	aria-label={TOY_LABELS[kind]}
>
	{#if kind === 'ball'}
		<circle cx="60" cy="60" r="46" fill="#ff8a66" />
		<path d="M18 44 Q60 68 102 44" fill="none" stroke="#fffdf8" stroke-width="10" />
		<path d="M28 84 Q60 100 92 84" fill="none" stroke="#ffd35c" stroke-width="10" />
		<circle cx="42" cy="40" r="8" fill="#fffdf8" opacity="0.85" />
	{:else if kind === 'car'}
		<rect x="14" y="52" width="92" height="34" rx="12" fill="#ffd35c" stroke={ink} stroke-width="4" />
		<path d="M34 52 L46 30 L78 30 L90 52 Z" fill="#bfe3f5" stroke={ink} stroke-width="4" stroke-linejoin="round" />
		<circle cx="36" cy="90" r="12" fill="#4a3728" />
		<circle cx="84" cy="90" r="12" fill="#4a3728" />
		<circle cx="36" cy="90" r="5" fill="#fffdf8" />
		<circle cx="84" cy="90" r="5" fill="#fffdf8" />
	{:else if kind === 'blocks'}
		<rect x="14" y="54" width="50" height="50" rx="12" fill="#bfe3f5" stroke={ink} stroke-width="4" />
		<rect x="52" y="18" width="48" height="48" rx="12" fill="#ffd35c" stroke={ink} stroke-width="4" />
		<circle cx="74" cy="40" r="8" fill="#fffdf8" opacity="0.9" />
	{:else if kind === 'wagon'}
		<path d="M24 62 L24 42 Q24 34 34 34 L36 34" fill="none" stroke={ink} stroke-width="6" stroke-linecap="round" />
		<rect x="16" y="52" width="88" height="40" rx="10" fill="#ff8a66" stroke={ink} stroke-width="4" />
		<path d="M16 66 L104 66" stroke="#ffd35c" stroke-width="7" />
		<circle cx="36" cy="98" r="11" fill="#4a3728" />
		<circle cx="84" cy="98" r="11" fill="#4a3728" />
		<circle cx="36" cy="98" r="4" fill="#fffdf8" />
		<circle cx="84" cy="98" r="4" fill="#fffdf8" />
	{:else}
		<!-- big teddy -->
		<circle cx="32" cy="32" r="14" fill="#d9a869" stroke={ink} stroke-width="3" />
		<circle cx="88" cy="32" r="14" fill="#d9a869" stroke={ink} stroke-width="3" />
		<circle cx="60" cy="66" r="40" fill="#d9a869" stroke={ink} stroke-width="3" />
		<ellipse cx="60" cy="78" rx="21" ry="17" fill="#f4dcc0" />
		<circle cx="46" cy="56" r="6" fill={ink} />
		<circle cx="74" cy="56" r="6" fill={ink} />
		<ellipse cx="60" cy="72" rx="7" ry="5" fill={ink} />
		<path d="M52 84 Q60 90 68 84" fill="none" stroke={ink} stroke-width="4" stroke-linecap="round" />
	{/if}
</svg>

<style>
	.goal-item {
		width: var(--item-size);
		height: auto;
		filter: drop-shadow(0 8px 12px rgba(74, 55, 40, 0.16));
	}
</style>

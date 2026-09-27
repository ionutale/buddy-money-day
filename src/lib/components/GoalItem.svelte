<script lang="ts">
	import { TOY_LABELS, type ToyId } from '$lib/game/economy';

	type Props = {
		kind: ToyId;
		size?: number;
	};

	let { kind, size = 96 }: Props = $props();

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
		<!-- the dream wagon: a pull-cart with a proud handle and a heart on its side -->
		<path d="M24 58 Q6 46 10 24" fill="none" stroke={ink} stroke-width="5" stroke-linecap="round" />
		<circle cx="10" cy="20" r="6" fill="#ffd35c" stroke={ink} stroke-width="4" />
		<circle cx="40" cy="97" r="14" fill={ink} />
		<circle cx="80" cy="97" r="14" fill={ink} />
		<circle cx="40" cy="97" r="5" fill="#fffdf8" />
		<circle cx="80" cy="97" r="5" fill="#fffdf8" />
		<path
			d="M20 56 L100 56 L94 84 Q93 92 84 92 L36 92 Q27 92 26 84 Z"
			fill="#ff8a66"
			stroke={ink}
			stroke-width="4"
			stroke-linejoin="round"
		/>
		<path
			d="M60 87 C51 80 46 75 46 69 C46 64 50 61 54 61 C57 61 59 63 60 66 C61 63 63 61 66 61 C70 61 74 64 74 69 C74 75 69 80 60 87 Z"
			fill="#ffd35c"
			stroke={ink}
			stroke-width="3"
			stroke-linejoin="round"
		/>
		<rect x="14" y="47" width="92" height="15" rx="7.5" fill="#ffd35c" stroke={ink} stroke-width="4" />
		<path d="M30 52 Q44 49 58 52" fill="none" stroke="#fffdf8" stroke-width="3" stroke-linecap="round" opacity="0.7" />
	{:else}
		<!-- the big teddy: a full-body bear, arms and feet included, bigger than the tidy-scene one -->
		<circle cx="36" cy="22" r="13" fill="#d9a869" stroke={ink} stroke-width="4" />
		<circle cx="84" cy="22" r="13" fill="#d9a869" stroke={ink} stroke-width="4" />
		<circle cx="36" cy="22" r="6" fill="#f4dcc0" />
		<circle cx="84" cy="22" r="6" fill="#f4dcc0" />
		<ellipse cx="60" cy="86" rx="33" ry="27" fill="#d9a869" stroke={ink} stroke-width="4" />
		<ellipse cx="60" cy="90" rx="19" ry="16" fill="#f4dcc0" />
		<ellipse cx="28" cy="79" rx="11" ry="16" fill="#d9a869" stroke={ink} stroke-width="4" transform="rotate(-16 28 79)" />
		<ellipse cx="92" cy="79" rx="11" ry="16" fill="#d9a869" stroke={ink} stroke-width="4" transform="rotate(16 92 79)" />
		<ellipse cx="38" cy="106" rx="15" ry="10" fill="#d9a869" stroke={ink} stroke-width="4" />
		<ellipse cx="82" cy="106" rx="15" ry="10" fill="#d9a869" stroke={ink} stroke-width="4" />
		<ellipse cx="38" cy="106" rx="6.5" ry="4.5" fill="#f4dcc0" />
		<ellipse cx="82" cy="106" rx="6.5" ry="4.5" fill="#f4dcc0" />
		<circle cx="60" cy="42" r="26" fill="#d9a869" stroke={ink} stroke-width="4" />
		<ellipse cx="60" cy="53" rx="13" ry="9" fill="#f4dcc0" />
		<circle cx="49" cy="37" r="3.6" fill={ink} />
		<circle cx="71" cy="37" r="3.6" fill={ink} />
		<ellipse cx="60" cy="49" rx="5.5" ry="4" fill={ink} />
		<path d="M54 56 Q60 61 66 56" fill="none" stroke={ink} stroke-width="3" stroke-linecap="round" />
		<path d="M60 77 L47 70 Q42.5 77 47 84 Z" fill="#ffd35c" stroke={ink} stroke-width="3" stroke-linejoin="round" />
		<path d="M60 77 L73 70 Q77.5 77 73 84 Z" fill="#ffd35c" stroke={ink} stroke-width="3" stroke-linejoin="round" />
		<circle cx="60" cy="77" r="4.5" fill="#ffd35c" stroke={ink} stroke-width="3" />
	{/if}
</svg>

<style>
	.goal-item {
		width: var(--item-size);
		height: auto;
		filter: drop-shadow(0 8px 12px rgba(74, 55, 40, 0.16));
	}
</style>

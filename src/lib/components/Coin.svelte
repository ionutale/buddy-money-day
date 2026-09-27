<script lang="ts">
	type Props = {
		size?: number;
		spin?: boolean;
	};

	let { size = 56, spin = false }: Props = $props();
	const uid = $props.id();
</script>

<!-- A sunny coin with a sparkle emboss. -->
<svg
	class="coin"
	class:coin-spin={spin}
	width={size}
	height={size}
	viewBox="0 0 64 64"
	role="img"
	aria-label="coin"
>
	<defs>
		<radialGradient id="coin-face-{uid}" cx="34%" cy="28%" r="85%">
			<stop offset="0%" stop-color="#ffefb8" />
			<stop offset="62%" stop-color="#ffd35c" />
			<stop offset="100%" stop-color="#e8a93a" />
		</radialGradient>
	</defs>
	<circle cx="32" cy="33" r="29" fill="#e8a93a" />
	<circle cx="32" cy="31" r="27" fill="url(#coin-face-{uid})" />
	<circle cx="32" cy="31" r="20" fill="none" stroke="#e8a93a" stroke-width="2.5" opacity="0.65" />
	<path d="M32 17 l3.6 9 9.4 1.4 -6.8 6.4 1.7 9.2 -7.9-4.2 -7.9 4.2 1.7-9.2 -6.8-6.4 9.4-1.4 z" fill="#fff3c9" stroke="#e8a93a" stroke-width="1.8" stroke-linejoin="round" />
	<circle class="coin-sparkle" cx="22" cy="20" r="3.2" fill="#fffdf3" />
</svg>

<style>
	.coin {
		filter: drop-shadow(0 4px 6px rgba(74, 55, 40, 0.18));
	}

	.coin-spin {
		animation: coin-flip 2.6s ease-in-out infinite;
	}
	@keyframes coin-flip {
		0%,
		55%,
		100% {
			transform: rotateY(0deg);
		}
		75% {
			transform: rotateY(180deg);
		}
	}

	.coin-sparkle {
		transform-box: fill-box;
		transform-origin: center;
		animation: coin-twinkle 1.7s ease-in-out infinite;
	}
	@keyframes coin-twinkle {
		50% {
			opacity: 0.25;
			transform: scale(0.6);
		}
	}
</style>

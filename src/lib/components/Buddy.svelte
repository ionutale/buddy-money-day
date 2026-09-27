<script lang="ts">
	export type BuddyMood = 'happy' | 'hungry' | 'sleepy' | 'celebrate';

	type Props = {
		mood?: BuddyMood;
		size?: number;
	};

	let { mood = 'happy', size = 180 }: Props = $props();
	const uid = $props.id();

	const ink = '#4a3728';
</script>

<!--
	Buddy: an inline-SVG plush creature. Moods change the eyes, brows, mouth,
	arms and ears; sleepy adds a night cap. Buddy is never sad.
-->
<svg
	class="buddy {mood}"
	style="--buddy-size: {size}px"
	viewBox="0 0 200 200"
	data-testid="buddy"
	data-mood={mood}
	role="img"
	aria-label="Buddy the plush"
>
	<defs>
		<radialGradient id="buddy-body-{uid}" cx="36%" cy="26%" r="88%">
			<stop offset="0%" stop-color="#b6ebdd" />
			<stop offset="100%" stop-color="#8ed4c0" />
		</radialGradient>
		<radialGradient id="buddy-belly-{uid}" cx="40%" cy="28%" r="95%">
			<stop offset="0%" stop-color="#fffdf6" />
			<stop offset="100%" stop-color="#ffeccb" />
		</radialGradient>
	</defs>

	<!-- ears -->
	<g transform={mood === 'sleepy' ? 'rotate(-22 46 52)' : 'rotate(-14 46 52)'}>
		<ellipse cx="46" cy="52" rx="22" ry="26" fill="#8ed4c0" />
		<ellipse cx="48" cy="54" rx="12" ry="15" fill="#b6ebdd" />
	</g>
	<g transform={mood === 'sleepy' ? 'rotate(22 154 52)' : 'rotate(14 154 52)'}>
		<ellipse cx="154" cy="52" rx="22" ry="26" fill="#8ed4c0" />
		<ellipse cx="152" cy="54" rx="12" ry="15" fill="#b6ebdd" />
	</g>

	<!-- arms -->
	{#if mood === 'celebrate'}
		<ellipse cx="34" cy="80" rx="15" ry="23" fill="#8ed4c0" transform="rotate(-40 34 80)" />
		<ellipse cx="166" cy="80" rx="15" ry="23" fill="#8ed4c0" transform="rotate(40 166 80)" />
	{:else}
		<ellipse cx="29" cy="130" rx="15" ry="23" fill="#8ed4c0" transform="rotate(18 29 130)" />
		<ellipse cx="171" cy="130" rx="15" ry="23" fill="#8ed4c0" transform="rotate(-18 171 130)" />
	{/if}

	<!-- feet -->
	<ellipse cx="70" cy="172" rx="22" ry="13" fill="#7cc9b3" />
	<ellipse cx="130" cy="172" rx="22" ry="13" fill="#7cc9b3" />

	<!-- body -->
	<ellipse cx="100" cy="112" rx="70" ry="64" fill="url(#buddy-body-{uid})" />
	<ellipse cx="100" cy="132" rx="39" ry="34" fill="url(#buddy-belly-{uid})" opacity="0.9" />

	<!-- sleepy night cap -->
	{#if mood === 'sleepy'}
		<g class="nightcap">
			<path d="M64 50 L100 6 L136 46 Z" fill="#ff8a66" />
			<path d="M74 44 Q100 34 126 42 L131 52 Q100 43 71 52 Z" fill="#ffd35c" />
			<circle cx="100" cy="7" r="9" fill="#fffdf8" />
			<path d="M86 28 q6 -6 12 0 q-6 6 -12 0" fill="#fffdf8" opacity="0.9" />
			<ellipse cx="100" cy="51" rx="45" ry="11" fill="#ffd35c" />
		</g>
	{/if}

	<!-- brows -->
	{#if mood === 'hungry'}
		<path class="brow" d="M58 80 Q70 71 82 80" />
		<path class="brow" d="M118 80 Q130 71 142 80" />
	{:else if mood === 'celebrate'}
		<path class="brow" d="M58 76 Q70 67 82 76" />
		<path class="brow" d="M118 76 Q130 67 142 76" />
	{/if}

	<!-- eyes -->
	{#if mood === 'sleepy'}
		<path class="eye-line" d="M62 100 q10 9 20 0" />
		<path class="eye-line" d="M118 100 q10 9 20 0" />
	{:else if mood === 'celebrate'}
		<path class="eye-line" d="M62 102 q10 -14 20 0" />
		<path class="eye-line" d="M118 102 q10 -14 20 0" />
	{:else}
		<g class="buddy-eyes">
			<ellipse cx="72" cy="100" rx="13" ry="14" fill="#fffdf8" />
			<ellipse cx="128" cy="100" rx="13" ry="14" fill="#fffdf8" />
			<circle cx="74" cy="103" r="7" fill={ink} />
			<circle cx="126" cy="103" r="7" fill={ink} />
			<circle cx="71" cy="99" r="2.6" fill="#fffdf8" />
			<circle cx="123" cy="99" r="2.6" fill="#fffdf8" />
		</g>
		{#if mood === 'hungry'}
			<path d="M59 108 q13 7 26 0" fill="none" stroke={ink} stroke-width="3" stroke-linecap="round" opacity="0.45" />
			<path d="M115 108 q13 7 26 0" fill="none" stroke={ink} stroke-width="3" stroke-linecap="round" opacity="0.45" />
		{/if}
	{/if}

	<!-- cheeks -->
	{#if mood === 'happy' || mood === 'celebrate'}
		<circle cx="62" cy="122" r="9" fill="#ff8a66" opacity="0.35" />
		<circle cx="138" cy="122" r="9" fill="#ff8a66" opacity="0.35" />
	{/if}

	<!-- mouth -->
	{#if mood === 'happy'}
		<path class="mouth" d="M84 128 Q100 142 116 128" />
	{:else if mood === 'hungry'}
		<ellipse cx="100" cy="134" rx="10" ry="12" fill="#7c4433" />
		<ellipse cx="100" cy="140" rx="6" ry="4.5" fill="#ff8a66" />
	{:else if mood === 'sleepy'}
		<ellipse cx="100" cy="132" rx="5.5" ry="6.5" fill="#7c4433" opacity="0.9" />
	{:else}
		<path d="M82 124 Q100 152 118 124 Z" fill="#7c4433" />
		<ellipse cx="100" cy="137" rx="9" ry="6" fill="#ff8a66" />
	{/if}

	<!-- hungry tummy rumble -->
	{#if mood === 'hungry'}
		<g class="rumble-lines" stroke={ink} stroke-width="3" stroke-linecap="round" fill="none" opacity="0.5">
			<path d="M78 146 q7 -6 14 0" />
			<path d="M110 148 q7 -6 14 0" />
		</g>
	{/if}

	<!-- sleepy z z z -->
	{#if mood === 'sleepy'}
		<g class="zzz" fill="#7cbcd9" font-weight="700" font-size="24">
			<text x="146" y="72">z</text>
			<text x="164" y="48">z</text>
			<text x="178" y="30" font-size="17">z</text>
		</g>
	{/if}

	<!-- celebrate confetti -->
	{#if mood === 'celebrate'}
		<g class="confetti">
			<circle cx="24" cy="52" r="6" fill="#ffd35c" />
			<circle cx="176" cy="44" r="6" fill="#ff8a66" />
			<circle cx="38" cy="150" r="6" fill="#8ed4c0" />
			<circle cx="168" cy="152" r="6" fill="#bfe3f5" />
			<rect x="14" y="102" width="10" height="10" rx="3" fill="#ff8a66" transform="rotate(20 19 107)" />
			<rect x="176" y="98" width="10" height="10" rx="3" fill="#ffd35c" transform="rotate(-18 181 103)" />
			<path class="sparkle" d="M30 24 l4 10 10 4 -10 4 -4 10 -4 -10 -10 -4 10 -4 z" fill="#ffd35c" />
			<path class="sparkle" d="M170 22 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3 z" fill="#ff8a66" />
		</g>
	{/if}
</svg>

<style>
	.buddy {
		width: var(--buddy-size);
		height: auto;
		filter: drop-shadow(0 12px 18px rgba(74, 55, 40, 0.18));
		overflow: visible;
	}

	.happy {
		animation: buddy-bob 3.4s ease-in-out infinite;
	}
	.sleepy {
		animation: buddy-breathe 4.6s ease-in-out infinite;
	}
	.celebrate {
		animation: buddy-hop 0.95s ease-in-out infinite;
	}

	@keyframes buddy-bob {
		50% {
			transform: translateY(-7px) rotate(-1.5deg);
		}
	}
	@keyframes buddy-breathe {
		50% {
			transform: scale(1.02);
		}
	}
	@keyframes buddy-hop {
		0%,
		100% {
			transform: translateY(0);
		}
		40% {
			transform: translateY(-11px) scale(1.02);
		}
		60% {
			transform: translateY(0);
		}
	}

	.buddy-eyes {
		transform-box: fill-box;
		transform-origin: center;
		animation: buddy-blink 4.8s infinite;
	}
	@keyframes buddy-blink {
		0%,
		91%,
		100% {
			transform: scaleY(1);
		}
		94% {
			transform: scaleY(0.07);
		}
	}

	.mouth,
	.eye-line,
	.brow {
		fill: none;
		stroke: #4a3728;
		stroke-linecap: round;
	}
	.mouth {
		stroke-width: 5.5;
	}
	.eye-line {
		stroke-width: 6;
	}
	.brow {
		stroke-width: 5;
	}

	.rumble-lines {
		transform-box: fill-box;
		transform-origin: center;
		animation: tummy-rumble 1.4s ease-in-out infinite;
	}
	@keyframes tummy-rumble {
		50% {
			transform: translateY(-2px);
			opacity: 0.9;
		}
	}

	.zzz text {
		animation: zzz-float 2.8s ease-in-out infinite;
	}
	.zzz text:nth-child(2) {
		animation-delay: 0.6s;
	}
	.zzz text:nth-child(3) {
		animation-delay: 1.2s;
	}
	@keyframes zzz-float {
		0%,
		100% {
			opacity: 0.25;
			transform: translateY(2px);
		}
		50% {
			opacity: 1;
			transform: translateY(-4px);
		}
	}

	.confetti circle,
	.confetti rect {
		transform-box: fill-box;
		transform-origin: center;
		animation: confetti-drift 1.7s ease-in-out infinite;
	}
	.confetti circle:nth-child(2n) {
		animation-delay: 0.5s;
	}
	.confetti circle:nth-child(3n) {
		animation-delay: 0.9s;
	}
	@keyframes confetti-drift {
		50% {
			transform: translateY(-6px) rotate(24deg);
		}
	}
</style>

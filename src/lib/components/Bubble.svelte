<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		tail?: 'left' | 'center' | 'right' | 'none';
		children: Snippet;
	};

	let { tail = 'center', children }: Props = $props();
</script>

<div class="bubble bubble-{tail}">
	{@render children()}
</div>

<style>
	.bubble {
		position: relative;
		max-width: min(440px, 88vw);
		background: #fffdf8;
		border-radius: 32px;
		padding: 18px 24px;
		font-size: 22px;
		font-weight: 500;
		line-height: 1.3;
		text-align: center;
		box-shadow: 0 12px 32px rgba(74, 55, 40, 0.15);
	}

	.bubble::after {
		content: '';
		position: absolute;
		width: 24px;
		height: 24px;
		background: #fffdf8;
		border-radius: 6px;
		transform: rotate(45deg);
		bottom: -10px;
		left: 50%;
		margin-left: -12px;
	}

	.bubble-left::after {
		left: 26%;
	}
	.bubble-right::after {
		left: 74%;
	}
	.bubble-none::after {
		display: none;
	}
</style>

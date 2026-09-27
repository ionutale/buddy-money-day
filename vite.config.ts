import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			// Fully static client-side app: no SSR, no server, per-device saves.
			// See docs/adr/0004-static-client-side-per-device-saves.md
			adapter: adapter({ fallback: 'index.html' })
		})
	],
	test: {
		include: ['src/**/*.spec.ts'],
		environment: 'node'
	}
});

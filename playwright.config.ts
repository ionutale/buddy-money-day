import { defineConfig } from '@playwright/test';

/**
 * Playthrough tests run against the production build in a phone-sized
 * portrait viewport. The web server command rebuilds every run so the
 * suite always exercises what the phone will actually load.
 */
export default defineConfig({
	testDir: 'e2e',
	fullyParallel: false,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	reporter: [['list']],
	use: {
		baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:4173',
		trace: 'on-first-retry',
		viewport: { width: 390, height: 844 },
		hasTouch: true,
		isMobile: true
	},
	webServer: process.env.E2E_BASE_URL
		? undefined
		: {
				command: 'pnpm build && pnpm preview --port 4173 --strictPort',
				url: 'http://localhost:4173',
				reuseExistingServer: !process.env.CI,
				timeout: 180_000
			}
});

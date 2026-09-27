import { defineConfig } from '@playwright/test';

/**
 * Playthrough tests run against the production build in a phone-sized
 * portrait viewport. The web server command rebuilds every run so the
 * suite always exercises what the phone will actually load.
 *
 * Port 43117 is deliberately unusual: this machine also runs other Vite
 * projects whose preview servers default to 4173. Reusing "whatever is on
 * the port" once silently pointed this suite at the wrong app — never again.
 * The host is pinned to 127.0.0.1 because `localhost` can bind IPv6-only,
 * which Playwright's probe then never reaches.
 */
export default defineConfig({
	testDir: 'e2e',
	fullyParallel: false,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	reporter: [['list']],
	use: {
		baseURL: process.env.E2E_BASE_URL ?? 'http://127.0.0.1:43117',
		trace: 'on-first-retry',
		viewport: { width: 390, height: 844 },
		hasTouch: true,
		isMobile: true
	},
	webServer: process.env.E2E_BASE_URL
		? undefined
		: {
				command: 'pnpm build && pnpm preview --host 127.0.0.1 --port 43117 --strictPort',
				url: 'http://127.0.0.1:43117',
				reuseExistingServer: false,
				timeout: 180_000
			}
});

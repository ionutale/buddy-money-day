import { expect, test, type Page } from '@playwright/test';
import { completeSetup } from './helpers';

/**
 * The voice is bundled audio: assert the app requests the right clip and that
 * silencing it requests nothing. Requests are stubbed, so no real audio plays.
 */

function captureVoice(page: Page): string[] {
	const requested: string[] = [];
	page.route('**/voice/*.mp3', (route) => {
		requested.push(route.request().url());
		return route.fulfill({ status: 200, contentType: 'audio/mpeg', body: Buffer.alloc(0) });
	});
	return requested;
}

test.describe('the pre-recorded voice', () => {
	test('voice on requests a clip for the scene', async ({ page }) => {
		await page.addInitScript(() => {
			localStorage.setItem('money-day-settings', JSON.stringify({ voiceEnabled: true }));
		});
		const requested = captureVoice(page);

		await page.goto('/');
		await completeSetup(page);
		await page.getByTestId('start-button').click({ force: true });
		await expect(page.getByTestId('greeting-start')).toBeVisible();

		await expect.poll(() => requested.some((url) => url.includes('/voice/'))).toBe(true);
	});

	test('?mute=1 requests no clips even with voice on', async ({ page }) => {
		await page.addInitScript(() => {
			localStorage.setItem('money-day-settings', JSON.stringify({ voiceEnabled: true }));
		});
		const requested = captureVoice(page);

		await page.goto('/?mute=1');
		await completeSetup(page);
		await page.getByTestId('start-button').click({ force: true });
		await expect(page.getByTestId('greeting-start')).toBeVisible();

		expect(requested).toHaveLength(0);
	});

	test('voice off requests no clips', async ({ page }) => {
		const requested = captureVoice(page);
		await page.goto('/');
		await completeSetup(page);
		await page.getByTestId('start-button').click({ force: true });
		await expect(page.getByTestId('greeting-start')).toBeVisible();

		expect(requested).toHaveLength(0);
	});
});
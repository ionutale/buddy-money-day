import { expect, test, type Page } from '@playwright/test';
import { completeSetup } from './helpers';

/**
 * Voice lives in Grown-up Setup and persists per device — deliberately separate
 * from the game save. Text bubbles keep every word either way.
 */

function storedSettings(page: Page) {
	return page.evaluate(() => {
		const raw = localStorage.getItem('money-day-settings');
		return raw === null ? null : JSON.parse(raw);
	});
}

test.describe('grown-up settings: voice', () => {
	test('a fresh install is silent; the switch turns voice on and sticks', async ({ page }) => {
		await page.goto('/');
		await expect(page.getByTestId('voice-toggle')).toHaveAttribute('aria-checked', 'false');

		await completeSetup(page);
		await page.getByTestId('open-setup-button').click();
		await page.getByTestId('voice-toggle').click();
		await expect(page.getByTestId('voice-toggle')).toHaveAttribute('aria-checked', 'true');
		await page.getByTestId('setup-close-button').click();

		await page.reload();
		await page.getByTestId('open-setup-button').click();
		await expect(page.getByTestId('voice-toggle')).toHaveAttribute('aria-checked', 'true');
		expect(await storedSettings(page)).toEqual({ voiceEnabled: true });
	});

	test('there is no actor picker any more, only a sample button', async ({ page }) => {
		await page.goto('/');
		await completeSetup(page);
		await page.getByTestId('open-setup-button').click();
		await page.getByTestId('voice-toggle').click();
		await expect(page.getByTestId('voice-preview')).toBeVisible();
		await expect(page.locator('[data-testid^="voice-option"]')).toHaveCount(0);
	});

	test('starting the game over keeps the voice choice', async ({ page }) => {
		await page.goto('/');
		await completeSetup(page);
		await page.getByTestId('open-setup-button').click();
		await page.getByTestId('voice-toggle').click();
		await page.getByTestId('reset-game-button').click();
		await page.getByTestId('reset-confirm').click();

		await expect(page.getByTestId('name-input')).toBeVisible();
		await expect(page.getByTestId('voice-toggle')).toHaveAttribute('aria-checked', 'true');
		expect(await storedSettings(page)).toEqual({ voiceEnabled: true });
	});
});
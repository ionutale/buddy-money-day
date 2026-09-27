import { expect, test } from '@playwright/test';
import { completeSetup, openGame, playDay, startMoneyDay, tuckIn } from './helpers';

test.describe('per-device saves and grown-up reset', () => {
	test('progress survives a reload: jar, home, and the day number', async ({ page }) => {
		await openGame(page);
		await completeSetup(page);
		await startMoneyDay(page);
		await playDay(page, { feed: 'feed' }); // 2 saved
		await tuckIn(page);

		await page.reload();

		await completeSetup(page); // no name prompt this time
		await page.getByTestId('start-button').click();
		await expect(page.getByTestId('greeting-start')).toBeVisible();
		await expect(page.getByTestId('jar-progress')).toHaveText(/2\s*\/\s*6/);
		await expect(page.getByTestId('day-badge')).toContainText('2');
	});

	test('the grown-up reset wipes everything back to first-run setup', async ({ page }) => {
		await openGame(page);
		await completeSetup(page);
		await startMoneyDay(page);
		await playDay(page, { feed: 'feed' });
		await tuckIn(page);

		await page.getByTestId('open-setup-button').click();
		await page.getByTestId('reset-game-button').click();
		await page.getByTestId('reset-confirm').click();

		await expect(page.getByTestId('name-input')).toBeVisible();
		await page.getByTestId('name-skip').click();
		await page.getByTestId('start-button').click();
		await expect(page.getByTestId('greeting-start')).toBeVisible();
		await expect(page.getByTestId('jar-progress')).toHaveText(/0\s*\/\s*6/);
	});
});

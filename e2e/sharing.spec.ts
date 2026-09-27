import { expect, test } from '@playwright/test';
import { completeSetup, openGame, startMoneyDay, tuckIn, tidyAllToys, waterAllDrops } from './helpers';

test.describe('helping the bird (sharing)', () => {
	test('three coins build the whole swing', async ({ page }) => {
		await openGame(page);
		await completeSetup(page);
		await startMoneyDay(page);

		await tidyAllToys(page);
		await waterAllDrops(page);
		await page.getByTestId('hunger-skip').click();

		await expect(page.getByTestId('swing-planks')).toHaveText(/0\s*\/\s*3/);
		for (let i = 0; i < 3; i++) {
			await page.getByTestId('friend-give').click();
		}
		await expect(page.getByTestId('swing-planks')).toHaveText(/3\s*\/\s*3/);

		await page.getByTestId('friend-done').click();
		await page.getByTestId('shelf-save').click(); // nothing left, still a fine day
		await expect(page.getByTestId('jars-continue')).toBeVisible();
		await page.getByTestId('jars-continue').click();
		await tuckIn(page);
	});

	test('giving nothing has no penalty and the day still ends well', async ({ page }) => {
		await openGame(page);
		await completeSetup(page);
		await startMoneyDay(page);

		await tidyAllToys(page);
		await waterAllDrops(page);
		await page.getByTestId('hunger-feed').click();
		await expect(page.getByTestId('swing-planks')).toHaveText(/0\s*\/\s*3/);
		await page.getByTestId('friend-done').click();

		await page.getByTestId('shelf-save').click();
		await expect(page.getByTestId('jars-continue')).toBeVisible();
		await page.getByTestId('jars-continue').click();
		await tuckIn(page);
	});
});

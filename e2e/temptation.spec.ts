import { expect, test } from '@playwright/test';
import {
	completeSetup,
	openGame,
	playDay,
	startMoneyDay,
	tidyAllToys,
	tuckIn,
	waterAllDrops
} from './helpers';

test.describe('the lollipop (temptation)', () => {
	test('choosing the lollipop is a celebration, and the leftover still reaches the jar', async ({
		page
	}) => {
		await openGame(page);
		await completeSetup(page);
		await startMoneyDay(page);

		// 3 coins earned; skip the bowl; the lollipop costs 2, one stays for the jar.
		await playDay(page, { feed: 'skip', spend: 'lollipop' });
		await tuckIn(page);

		await page.getByTestId('start-button').click();
		await expect(page.getByTestId('greeting-start')).toBeVisible();
		await expect(page.getByTestId('jar-progress')).toHaveText(/1\s*\/\s*6/);
	});

	test('with only one coin left the lollipop is denied, and the coin still reaches the jar', async ({
		page
	}) => {
		await openGame(page);
		await completeSetup(page);
		await startMoneyDay(page);

		await tidyAllToys(page);
		await waterAllDrops(page);
		await page.getByTestId('hunger-skip').click();

		// Give two coins away: three minus two leaves one.
		await page.getByTestId('friend-give').click();
		await page.getByTestId('friend-give').click();
		await page.getByTestId('friend-done').click();

		await expect(page.getByTestId('shelf-save')).toBeVisible();
		await page.getByTestId('shelf-lollipop').click({ force: true });
		await expect(page.getByTestId('lollipop-bought')).toHaveCount(0);

		await page.getByTestId('shelf-save').click();
		await expect(page.getByTestId('jars-continue')).toBeVisible();
		await page.getByTestId('jars-continue').click();
		await tuckIn(page);

		await page.getByTestId('start-button').click();
		await expect(page.getByTestId('greeting-start')).toBeVisible();
		await expect(page.getByTestId('jar-progress')).toHaveText(/1\s*\/\s*6/);
	});
});

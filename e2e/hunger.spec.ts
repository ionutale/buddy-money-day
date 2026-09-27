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

test.describe('buddy goes hungry (needs vs wants)', () => {
	test('skipping the bowl leaves Buddy droopy at night and in the morning, and one coin fixes it', async ({
		page
	}) => {
		await openGame(page);
		await completeSetup(page);

		// Day 1: no food.
		await startMoneyDay(page);
		await playDay(page, { feed: 'skip' });
		await expect(page.getByTestId('buddy')).toHaveAttribute('data-mood', 'sad');
		await tuckIn(page);

		// Day 2: Buddy is still droopy in the morning...
		await page.getByTestId('start-button').click();
		await expect(page.getByTestId('greeting-start')).toBeVisible();
		await expect(page.getByTestId('buddy')).toHaveAttribute('data-mood', 'sad');
		await page.getByTestId('greeting-start').click();
		await expect(page.getByTestId('toy-0')).toBeVisible();

		// ...until he is fed.
		await tidyAllToys(page);
		await waterAllDrops(page);
		await page.getByTestId('hunger-feed').click();
		await expect(page.getByTestId('buddy')).not.toHaveAttribute('data-mood', 'sad');

		// The rest of the day proceeds, and bedtime is peaceful again.
		await page.getByTestId('friend-done').click();
		await page.getByTestId('shelf-save').click();
		await expect(page.getByTestId('jars-continue')).toBeVisible();
		await page.getByTestId('jars-continue').click();
		await expect(page.getByTestId('tuckin-done')).toBeVisible();
		await expect(page.getByTestId('buddy')).not.toHaveAttribute('data-mood', 'sad');
	});
});

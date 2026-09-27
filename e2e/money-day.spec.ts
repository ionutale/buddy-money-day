import { expect, test } from '@playwright/test';
import { completeSetup, nextDay, openGame, playDay, startMoneyDay, tuckIn } from './helpers';

test.describe('the whole money day loop', () => {
	test('two days of saving reach the goal, and the goal becomes a home item', async ({
		page
	}) => {
		await openGame(page);
		await completeSetup(page);

		// Day 1: skip the bowl and the bird, save everything (default path).
		await startMoneyDay(page);
		await playDay(page, { feed: 'skip' });

		// Skipping food leaves Buddy droopy at bedtime.
		await expect(page.getByTestId('buddy')).toHaveAttribute('data-mood', 'sad');
		await tuckIn(page);

		// Day 2: three more coins reach the goal price.
		await nextDay(page);
		await playDay(page, { feed: 'skip' });

		await expect(page.getByTestId('goal-celebrate')).toBeVisible();
		await page.getByTestId('goal-celebrate').click();

		// Pick a new goal among the three cards.
		await expect(page.getByTestId('goal-option-hat')).toBeVisible();
		await expect(page.getByTestId('goal-option-slide')).toBeVisible();
		await page.getByTestId('goal-option-hat').click();

		// The finished kite now lives in Buddy's home...
		await tuckIn(page);
		await expect(page.getByTestId('home-item-kite')).toBeVisible();

		// ...and the jar restarts empty on the next money day.
		await nextDay(page);
		await expect(page.getByTestId('jar-progress')).toHaveText(/0\s*\/\s*6/);
	});

	test('coins in hand never survive the night, the jar does', async ({ page }) => {
		await openGame(page);
		await completeSetup(page);

		await startMoneyDay(page);
		await playDay(page, { feed: 'feed' }); // 3 earned, 1 fed -> 2 saved
		await tuckIn(page);

		await expect(page.getByTestId('start-button')).toBeVisible();
		await page.getByTestId('start-button').click();
		await expect(page.getByTestId('greeting-start')).toBeVisible();

		await expect(page.getByTestId('jar-progress')).toHaveText(/2\s*\/\s*6/);
		await expect(page.getByTestId('coin-count')).toHaveText(/0/);
	});
});

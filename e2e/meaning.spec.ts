import { expect, test } from '@playwright/test';
import { completeSetup, openGame, startMoneyDay, tidyAllToys, waterAllDrops } from './helpers';

test.describe('the meaning layer', () => {
	test('the goal is always on screen', async ({ page }) => {
		await openGame(page);
		await completeSetup(page);

		// Title screen: the Goal with six empty slots and nothing earned yet.
		await expect(page.getByTestId('goal-banner')).toBeVisible();
		for (let i = 0; i < 6; i++) {
			await expect(page.getByTestId(`goal-slot-${i}`)).toHaveAttribute('data-filled', 'false');
		}

		await startMoneyDay(page);
		await expect(page.getByTestId('goal-banner')).toBeVisible();

		// Earning fills the hand, not the jar (the banner does not move yet).
		await tidyAllToys(page);
		await waterAllDrops(page);
		await expect(page.getByTestId('coin-count')).toHaveText(/3/);
		await expect(page.getByTestId('jar-progress')).toHaveText(/0\s*\/\s*6/);
		for (let i = 0; i < 6; i++) {
			await expect(page.getByTestId(`goal-slot-${i}`)).toHaveAttribute('data-filled', 'false');
		}
	});
});

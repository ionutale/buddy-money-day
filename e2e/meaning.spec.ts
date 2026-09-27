import { expect, test } from '@playwright/test';
import {
	completeSetup,
	nextDay,
	openGame,
	playDay,
	startMoneyDay,
	tidyAllToys,
	tuckIn,
	waterAllDrops
} from './helpers';

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

	test('every task states its deal', async ({ page }) => {
		await openGame(page);
		await completeSetup(page);
		await startMoneyDay(page);

		// Tidy announces its reason and deal, carries its price, and pays visibly.
		await expect(page.getByTestId('price-tag-tidy')).toContainText('2');
		await expect(page.getByText('two coins')).toBeVisible();
		await tidyAllToys(page);
		await expect(page.getByTestId('goal-toast')).toContainText('Two coins earned!');

		// Water does the same for its one coin.
		await expect(page.getByTestId('price-tag-water')).toContainText('1');
		await expect(page.getByText('one coin')).toBeVisible();
		await waterAllDrops(page);
		await expect(page.getByTestId('goal-toast')).toContainText('One coin earned!');
	});

	test('a spend restates the goal', async ({ page }) => {
		await openGame(page);
		await completeSetup(page);
		await startMoneyDay(page);
		await tidyAllToys(page);
		await waterAllDrops(page);

		await page.getByTestId('hunger-feed').click();
		await expect(page.getByTestId('goal-toast')).toContainText('still has 0 of 6');
		await expect(page.getByTestId('jar-progress')).toHaveText(/0\s*\/\s*6/);
	});

	test('the shelf previews the outcome', async ({ page }) => {
		await openGame(page);
		await completeSetup(page);
		await startMoneyDay(page);
		await playDay(page, { feed: 'skip' }); // day 1: save three
		await tuckIn(page);

		await nextDay(page);
		await tidyAllToys(page);
		await waterAllDrops(page);
		await page.getByTestId('hunger-skip').click();
		await page.getByTestId('friend-done').click();

		await expect(page.getByTestId('shelf-preview')).toHaveAttribute('data-preview-filled', '6');
		await expect(page.getByTestId('shelf-preview')).toHaveAttribute('data-complete', 'true');
		await expect(page.getByText(/6 of 6/)).toBeVisible();
	});

	test('the lollipop spend restates the goal', async ({ page }) => {
		await openGame(page);
		await completeSetup(page);
		await startMoneyDay(page);
		await tidyAllToys(page);
		await waterAllDrops(page);
		await page.getByTestId('hunger-skip').click();
		await page.getByTestId('friend-done').click();

		await page.getByTestId('shelf-lollipop').click({ force: true });
		await expect(page.getByTestId('lollipop-bought')).toBeVisible();
		await expect(page.getByTestId('goal-toast')).toContainText('still has 0 of 6');
	});
});

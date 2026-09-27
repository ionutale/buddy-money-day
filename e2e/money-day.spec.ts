import { expect, test } from '@playwright/test';
import { completeSetup, doChore, nextDay, openGame, startMoneyDay, tuckIn } from './helpers';

/**
 * The whole Money Day loop, end to end: three chores pay four coins, the
 * store's save button carries them into the jar, and the day ends at tuck-in.
 * Three saving days reach the wagon; coins in hand never survive the night,
 * the jar does.
 */
test.describe('the whole money day loop', () => {
	test('three saving days reach the dream', async ({ page }) => {
		// Three days with all their celebration beats outlast the 30 s default.
		test.setTimeout(90_000);

		await openGame(page);
		await completeSetup(page);

		// Days 1 and 2: all four coins go to the jar (4 → 8).
		for (const day of [1, 2]) {
			if (day === 1) await startMoneyDay(page);
			else await nextDay(page);
			for (const chore of ['tidy', 'water', 'feed'] as const) await doChore(page, chore);
			await page.getByTestId('to-store-button').click();
			await page.getByTestId('store-save-button').click();
			await expect(page.getByTestId('recap-text')).toContainText(`has ${day * 4} of 12`);
			await tuckIn(page);
		}

		// Day 3: the jar reaches 12, and the save opens the dream celebration.
		await nextDay(page);
		for (const chore of ['tidy', 'water', 'feed'] as const) await doChore(page, chore);
		await page.getByTestId('to-store-button').click();
		await page.getByTestId('store-save-button').click();
		await expect(page.getByTestId('dream-celebrate')).toBeVisible();
	});

	test('coins in hand never survive the night, the jar does', async ({ page }) => {
		await openGame(page);
		await completeSetup(page);

		// Day 1: the whole day pays four coins into the hand.
		await startMoneyDay(page);
		for (const chore of ['tidy', 'water', 'feed'] as const) await doChore(page, chore);
		await expect(page.getByTestId('coin-count')).toHaveText('4');

		// The save carries them into the jar; the night starts at tuck-in.
		await page.getByTestId('to-store-button').click();
		await page.getByTestId('store-save-button').click();
		await expect(page.getByTestId('recap-text')).toBeVisible();
		await tuckIn(page);

		// The next Money Day wakes with an empty hand and the jar untouched.
		await nextDay(page);
		await expect(page.getByTestId('coin-count')).toHaveText('0');
		await expect(page.getByTestId('jar-progress')).toHaveText('4 / 12');
	});
});

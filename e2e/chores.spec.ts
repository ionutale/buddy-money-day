import { expect, test } from '@playwright/test';
import { completeSetup, doChore, openGame, startMoneyDay } from './helpers';

/**
 * The job board is the day's hub: three jobs, any order, each once.
 * These tests lock the board's deal with the child: cards carry their price,
 * each job pays and checks off when it lands, and the cap line + the store
 * door appear only once the whole day's work is done.
 */
test.describe('the job board', () => {
	test('the jobs pay in any order and each checks its own card', async ({ page }) => {
		await openGame(page);
		await completeSetup(page);
		await startMoneyDay(page);

		// All three jobs are offered up front, with their price badges and no check.
		const jobs: [string, string][] = [
			['tidy', '2'],
			['water', '1'],
			['feed', '1']
		];
		for (const [chore, price] of jobs) {
			const card = page.getByTestId(`job-card-${chore}`);
			await expect(card).toBeVisible();
			await expect(card).toContainText(price);
			await expect(card.getByRole('img', { name: 'coin' })).toBeVisible();
			await expect(card).toHaveAttribute('data-done', 'false');
		}

		// Nothing is done yet: no cap line, no store door.
		await expect(page.getByTestId('cap-line')).toHaveCount(0);
		await expect(page.getByTestId('to-store-button')).toHaveCount(0);

		// Feed first: pays one coin and checks its card (and can't be taken twice).
		await doChore(page, 'feed');
		await expect(page.getByTestId('coin-count')).toHaveText('1');
		await expect(page.getByTestId('job-card-feed')).toHaveAttribute('data-done', 'true');
		await expect(page.getByTestId('job-card-feed')).toBeDisabled();
		await expect(page.getByTestId('cap-line')).toHaveCount(0);

		// Water second: one more coin.
		await doChore(page, 'water');
		await expect(page.getByTestId('coin-count')).toHaveText('2');
		await expect(page.getByTestId('job-card-water')).toHaveAttribute('data-done', 'true');
		await expect(page.getByTestId('cap-line')).toHaveCount(0);

		// Tidy last: two coins, and only now the cap line and the store door.
		await doChore(page, 'tidy');
		await expect(page.getByTestId('coin-count')).toHaveText('4');
		await expect(page.getByTestId('job-card-tidy')).toHaveAttribute('data-done', 'true');
		await expect(page.getByTestId('cap-line')).toHaveText('All chores done! More tomorrow.');
		await expect(page.getByTestId('to-store-button')).toBeVisible();
	});

	test('the cap line and the store door wait for the last chore', async ({ page }) => {
		await openGame(page);
		await completeSetup(page);
		await startMoneyDay(page);

		// Two jobs done, one still open — the day is not over yet.
		await doChore(page, 'tidy');
		await doChore(page, 'water');
		await expect(page.getByTestId('cap-line')).toHaveCount(0);
		await expect(page.getByTestId('to-store-button')).toHaveCount(0);
		await expect(page.getByTestId('store-shelf')).toHaveCount(0);

		// The third job unlocks the way to the store.
		await doChore(page, 'feed');
		await expect(page.getByTestId('cap-line')).toBeVisible();
		await page.getByTestId('to-store-button').click();
		await expect(page.getByTestId('store-shelf')).toBeVisible();
	});

	test('the greeting keeps the plan line; the job cards live on the board', async ({ page }) => {
		await openGame(page);
		await completeSetup(page);
		await page.getByTestId('start-button').click({ force: true });
		await expect(page.getByTestId('greeting-start')).toBeVisible();

		// The spoken plan line stays in the greeting; the cards have moved out.
		await expect(page.getByText('Today we can earn 4 coins for your wagon!')).toBeVisible();
		await expect(page.getByTestId('plan-card-tidy')).toHaveCount(0);
		await expect(page.getByTestId('plan-card-water')).toHaveCount(0);
		await expect(page.getByTestId('plan-card-feed')).toHaveCount(0);

		await page.getByTestId('greeting-start').click({ force: true });

		// The board carries all three jobs.
		await expect(page.getByTestId('job-board')).toBeVisible();
		await expect(page.getByTestId('job-card-tidy')).toBeVisible();
		await expect(page.getByTestId('job-card-water')).toBeVisible();
		await expect(page.getByTestId('job-card-feed')).toBeVisible();
	});
});

import { expect, test, type Page } from '@playwright/test';
import { completeSetup, doChore, dragLocator, openGame, seedSave, startMoneyDay } from './helpers';

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

	test('feeding the bear: three bites, each one munches, the third pays', async ({ page }) => {
		await openGame(page);
		await completeSetup(page);
		await startMoneyDay(page);
		await page.getByTestId('job-card-feed').click();

		// The deal: a hungry bear, a bowl, three snacks — and no way to skip.
		const bowl = page.getByTestId('bear-bowl');
		await expect(bowl).toBeVisible();
		await expect(bowl).toHaveAttribute('data-bites', '0');
		for (const i of [0, 1, 2]) {
			await expect(page.getByTestId(`feed-snack-${i}`)).toBeVisible();
		}
		await expect(page.getByTestId('hunger-skip')).toHaveCount(0);
		await expect(page.getByTestId('feed-give')).toHaveCount(0);
		const bear = page.getByTestId('buddy');
		await expect(bear).toHaveAttribute('data-mood', 'hungry');

		// First bite: the snack lands, the bear munches and cheers up.
		const first = page.getByTestId('feed-snack-0');
		await dragLocator(page, first, bowl);
		await expect(first).toHaveClass(/accepted/);
		await expect(bowl).toHaveAttribute('data-bites', '1');
		await expect(bear).toHaveAttribute('data-mood', 'happy');
		await expect(page.getByTestId('coin-count')).toHaveText('0');

		// Re-dragging an accepted snack is a no-op.
		await dragLocator(page, first, bowl);
		await expect(bowl).toHaveAttribute('data-bites', '1');
		await expect(bear).toHaveAttribute('data-mood', 'happy');
		await expect(page.getByTestId('coin-count')).toHaveText('0');

		// Second bite: another munch.
		await dragLocator(page, page.getByTestId('feed-snack-1'), bowl);
		await expect(bowl).toHaveAttribute('data-bites', '2');

		// Third bite: the bear celebrates, pays one coin, and the board returns.
		await dragLocator(page, page.getByTestId('feed-snack-2'), bowl);
		await expect(bowl).toHaveAttribute('data-bites', '3');
		await expect(bear).toHaveAttribute('data-mood', 'celebrate');
		await expect(page.getByTestId('goal-toast')).toContainText('One coin earned!');
		await expect(page.getByTestId('coin-count')).toHaveText('1');
		await expect(page.getByTestId('job-board')).toBeVisible();
		await expect(page.getByTestId('job-card-feed')).toHaveAttribute('data-done', 'true');
	});
});

/**
 * The tidy floor is seeded by the day number: six kinds in the pool, three
 * scattered each day. A reload mid-day must show the child the same trio —
 * so the day under test is day 2, where a day-reset bug would deal day 1's
 * trio instead and the "different seed" would be caught.
 */
const DAY_TWO_SAVE = {
	schemaVersion: 2,
	childName: 'Sam',
	nameSkipped: false,
	day: 2,
	goal: 'wagon',
	jarCoins: 0,
	owned: []
};

test.describe('the daily tidy trio', () => {
	test('shows three toys, and a mid-day reload keeps the same trio', async ({ page }) => {
		// Start on day 2, as if yesterday had been tucked in.
		await seedSave(page, DAY_TWO_SAVE);
		await openGame(page);
		await completeSetup(page);
		await startMoneyDay(page);
		await expect(page.getByTestId('day-badge')).toContainText('Day 2');
		await page.getByTestId('job-card-tidy').click();

		// Exactly three toys, each tagged with the kind it was picked as.
		const toys = page.locator('[data-testid^="toy-"]');
		await expect(toys).toHaveCount(3);
		const before = await tidyToyKinds(page);
		expect(before).toHaveLength(3);
		expect(before.every((kind) => kind !== null && kind !== '')).toBe(true);

		// Reload in the middle of the day: the day number is durable, so the trio is too.
		await page.reload();
		await completeSetup(page);
		await startMoneyDay(page);
		await expect(page.getByTestId('day-badge')).toContainText('Day 2');
		await page.getByTestId('job-card-tidy').click();

		await expect(toys).toHaveCount(3);
		expect(await tidyToyKinds(page)).toEqual(before);
	});
});

/** The kinds, in toy-0..2 order, of the toys scattered in the tidy scene. */
async function tidyToyKinds(page: Page): Promise<(string | null)[]> {
	return await page
		.locator('[data-testid^="toy-"]')
		.evaluateAll((toys) => toys.map((toy) => toy.getAttribute('data-kind')));
}

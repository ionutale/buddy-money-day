import { expect, test } from '@playwright/test';
import {
	completeSetup,
	doChore,
	feedAllSnacks,
	finishChores,
	finishDay,
	nextDay,
	openGame,
	openStore,
	saveDay,
	startMoneyDay,
	tuckIn
} from './helpers';

/**
 * The meaning layer: the dream banner, the job board's deals, the feed as a
 * paid job, the store restating the dream, and the tuck-in recap — every
 * number the child sees tied to the dream toy and its price.
 */
test.describe('the meaning layer', () => {
	test('the banner always shows the dream in twelve slots', async ({ page }) => {
		await openGame(page);
		await completeSetup(page);

		// Title screen: the whole dream, twelve empty slots.
		await expect(page.getByTestId('goal-banner')).toBeVisible();
		await expect(page.locator('[data-testid^="goal-slot-"]')).toHaveCount(12);
		await expect(page.getByTestId('goal-slot-0')).toHaveAttribute('data-filled', 'false');
		await expect(page.getByTestId('goal-slot-11')).toHaveAttribute('data-filled', 'false');

		await startMoneyDay(page);

		// Earning fills the hand, not the jar: the banner does not move yet.
		await finishChores(page);
		await expect(page.getByTestId('coin-count')).toHaveText('4');
		await expect(page.getByTestId('jar-progress')).toHaveText('0 / 12');
		await expect(page.getByTestId('goal-slot-3')).toHaveAttribute('data-filled', 'false');

		// While choosing, the store previews the save: four slots will light up.
		await openStore(page);
		await expect(page.getByTestId('goal-slot-3')).toHaveAttribute('data-filled', 'true');
		await expect(page.getByTestId('goal-slot-4')).toHaveAttribute('data-filled', 'false');

		// The save lands: four slots hold, the jar reads four of twelve.
		await saveDay(page);
		await expect(page.getByTestId('jar-progress')).toHaveText('4 / 12');
		await expect(page.getByTestId('goal-slot-3')).toHaveAttribute('data-filled', 'true');
		await expect(page.getByTestId('goal-slot-4')).toHaveAttribute('data-filled', 'false');
	});

	test("the job board states each job's deal", async ({ page }) => {
		await openGame(page);
		await completeSetup(page);
		await page.getByTestId('start-button').click({ force: true });
		await expect(page.getByTestId('greeting-start')).toBeVisible();

		// The greeting speaks the day's whole plan.
		await expect(page.getByText('Today we can earn 4 coins for your wagon!')).toBeVisible();
		await page.getByTestId('greeting-start').click({ force: true });

		// Each card offers its job and its pay. The price is the `.job-pay`
		// node alone — the coin icon plus one number — so it is asserted as the
		// whole node text, not "any digit somewhere on the card".
		const deals: [string, string, number][] = [
			['tidy', 'Tidy the toys', 2],
			['water', 'Water the tree', 1],
			['feed', 'Feed the bear', 1]
		];
		for (const [chore, name, price] of deals) {
			const card = page.getByTestId(`job-card-${chore}`);
			await expect(card).toContainText(name);
			await expect(card.locator('.job-pay')).toHaveText(new RegExp(`^${price}$`));
		}
		await expect(page.getByTestId('cap-line')).toHaveCount(0);

		// Any order works: feed, tidy, water. The cap line and the store door
		// wait until the whole day's work is done.
		await doChore(page, 'feed');
		await doChore(page, 'tidy');
		await expect(page.getByTestId('cap-line')).toHaveCount(0);
		await expect(page.getByTestId('to-store-button')).toHaveCount(0);
		await doChore(page, 'water');
		await expect(page.getByTestId('cap-line')).toHaveText('All chores done! More tomorrow.');
		await expect(page.getByTestId('to-store-button')).toBeVisible();
	});

	test('feeding the bear is a paid job with no way to skip', async ({ page }) => {
		await openGame(page);
		await completeSetup(page);
		await startMoneyDay(page);
		await page.getByTestId('job-card-feed').click();

		// The deal on screen: three snacks, a bowl, a hungry bear — no skip.
		await expect(page.getByText("I'm hungry! Feed me and I'll pay you a coin!")).toBeVisible();
		await expect(page.getByTestId('price-tag-feed')).toContainText('1');
		for (const i of [0, 1, 2]) {
			await expect(page.getByTestId(`feed-snack-${i}`)).toBeVisible();
		}
		await expect(page.getByTestId('hunger-skip')).toHaveCount(0);

		// Each snack is dragged into the bowl; the third pays one coin.
		await feedAllSnacks(page);
		await expect(page.getByTestId('goal-toast')).toContainText('One coin earned!');
		await expect(page.getByTestId('coin-count')).toHaveText('1');
		await expect(page.getByTestId('job-card-feed')).toHaveAttribute('data-done', 'true');
	});

	test('the store restates the dream for a buy and a save', async ({ page }) => {
		await openGame(page);
		await completeSetup(page);
		await startMoneyDay(page);
		await finishChores(page);
		await openStore(page);

		// The save is the default path, and its line names the current dream.
		await expect(page.getByText('Time to choose! A toy now, or save for your wagon?')).toBeVisible();
		await expect(page.getByTestId('store-save-button')).toContainText(
			'Save the rest for your wagon.'
		);

		// A buy celebrates and restates the dream where the purchase leaves it.
		await page.getByTestId('store-toy-ball').click();
		await expect(page.getByTestId('goal-toast')).toContainText(
			"It's in your room! Your wagon has 0 of 12."
		);
		await expect(page.getByTestId('store-toy-ball')).toHaveAttribute('data-owned', 'true');
		await expect(page.getByTestId('store-save-button')).toContainText(
			'Save the rest for your wagon.'
		);

		// The remaining two coins go to the jar; the recap uses the dream's numbers.
		await saveDay(page);
		await expect(page.getByTestId('recap-text')).toContainText('Your wagon has 2 of 12');
	});

	test('the recap tells the truth while still saving', async ({ page }) => {
		await openGame(page);
		await completeSetup(page);
		await startMoneyDay(page);
		await finishDay(page);

		// The honest bookend: what today paid, where the dream stands, what is left.
		await expect(page.getByTestId('recap-text')).toContainText('Today you earned 4 coins.');
		await expect(page.getByTestId('recap-text')).toContainText('Your wagon has 4 of 12');
		await expect(page.getByTestId('recap-text')).toContainText('8 more chores tomorrow!');
	});

	test('three saving days bring the wagon home', async ({ page }) => {
		// Three full Money Days with celebration beats outlast the 30 s default.
		test.setTimeout(90_000);

		await openGame(page);
		await completeSetup(page);

		// Days 1 and 2: four coins earned, all of them saved (4 → 8).
		for (const day of [1, 2]) {
			if (day === 1) await startMoneyDay(page);
			else await nextDay(page);
			await finishDay(page);
			await expect(page.getByTestId('recap-text')).toContainText(`has ${day * 4} of 12`);
			await tuckIn(page);
		}

		// Day 3: the jar reaches 12 and the wagon is reached.
		await nextDay(page);
		await finishDay(page);

		// The last coin fills the last slot before the celebration.
		await expect(page.getByTestId('dream-celebrate')).toBeVisible();
		for (let i = 0; i < 12; i++) {
			await expect(page.getByTestId(`goal-slot-${i}`)).toHaveAttribute('data-filled', 'true');
		}
		await page.getByTestId('dream-celebrate').click();

		// The recap names the wagon and points at the next dream.
		await expect(page.getByTestId('recap-text')).toContainText('The wagon is yours');
		await expect(page.getByTestId('recap-text')).toContainText('big teddy needs 12 coins');
		await expect(page.getByTestId('goal-banner')).toHaveAttribute('aria-label', /big teddy/);
		await tuckIn(page);

		// Back at the title: the wagon is on the strip, and My Toys has a door.
		await expect(page.getByTestId('owned-strip')).toBeVisible();
		await expect(page.getByTestId('owned-toy-wagon')).toBeVisible();
		await expect(page.getByTestId('toys-door')).toBeVisible();
	});
});

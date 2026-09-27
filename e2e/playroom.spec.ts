import { expect, test, type Page } from '@playwright/test';
import {
	completeSetup,
	finishChores,
	openGame,
	openStore,
	saveDay,
	startMoneyDay,
	tuckIn
} from './helpers';

/**
 * My Toys: the room behind the title door and the ball's no-fail keepy-uppy
 * game. Play mode lives outside the engine, so the strongest claim here is a
 * negative one — the child's save is byte-identical before the room and after
 * the mini-game's house button. `pageerror` is watched for the same reason:
 * tap-spam must never throw.
 */

/** The child's whole local save, as a deep-comparable snapshot. */
async function saveSnapshot(page: Page): Promise<Record<string, string>> {
	return await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
}

function watchForThrows(page: Page): Error[] {
	const errors: Error[] = [];
	page.on('pageerror', (error) => errors.push(error));
	return errors;
}

const SAVE_KEY = 'money-day-save';

/**
 * A v2 save from after the dream list has wrapped: wagon → teddy → wagon.
 * The engine keeps the repeat on purpose ("a second teddy is a real thing"),
 * so the render must too — an id-keyed list throws `each_key_duplicate`,
 * which once turned the My Toys door into a dead end.
 */
const CYCLED_SAVE = {
	schemaVersion: 2,
	childName: 'Sam',
	nameSkipped: false,
	day: 10,
	goal: 'wagon',
	jarCoins: 0,
	owned: ['wagon', 'teddy', 'wagon']
};

test.describe('My Toys', () => {
	test('a fresh install finds a gentle, empty room and no save changes', async ({ page }) => {
		const errors = watchForThrows(page);

		await openGame(page);
		await completeSetup(page);
		await expect(page.getByTestId('toys-room')).toHaveCount(0);

		const before = await saveSnapshot(page);

		await page.getByTestId('toys-door').click();
		await expect(page.getByTestId('toys-room')).toBeVisible();
		await expect(page.getByTestId('toys-empty')).toHaveText(
			'No toys yet! Do chores, then visit the store.'
		);
		await expect(page.getByTestId('toy-ball')).toHaveCount(0);

		await page.getByTestId('toys-exit').click();
		await expect(page.getByTestId('toys-room')).toHaveCount(0);
		await expect(page.getByTestId('start-button')).toBeVisible();

		expect(await saveSnapshot(page)).toEqual(before);
		expect(errors).toEqual([]);
	});

	test('the ball comes home, bounces forever, and play writes nothing', async ({ page }) => {
		const errors = watchForThrows(page);

		await openGame(page);
		await completeSetup(page);
		await startMoneyDay(page);
		await finishChores(page);
		await openStore(page);

		// Buy the ball, then send the rest of the day's coins to the dream.
		const shelfBall = page.getByTestId('store-toy-ball');
		await expect(shelfBall).toBeVisible();
		await shelfBall.click();
		await expect(shelfBall).toHaveAttribute('data-owned', 'true');
		await saveDay(page);
		await expect(page.getByTestId('recap-text')).toBeVisible();
		await tuckIn(page);

		await expect(page.getByTestId('owned-toy-ball')).toBeVisible();
		const before = await saveSnapshot(page);

		// The ball sits on the room's rug, under its own name.
		await page.getByTestId('toys-door').click();
		await expect(page.getByTestId('toys-room')).toBeVisible();
		await expect(page.getByTestId('toy-ball')).toBeVisible();

		// Its mini-game fills the screen; the exit stays put the whole time.
		await page.getByTestId('toy-ball').click();
		const ball = page.getByTestId('mini-game-ball');
		await expect(ball).toBeVisible();
		await expect(page.getByTestId('mini-game-exit')).toBeVisible();
		await expect(ball).toHaveAttribute('data-bounces', '0');

		// The ball keeps moving by design, so taps skip Playwright's stability
		// gate — exactly like the bobbing water drops.
		await ball.click({ force: true });
		await ball.click({ force: true });
		await ball.click({ force: true });
		await expect(ball).toHaveAttribute('data-bounces', '3');

		// Tap-spam is the failure mode the game must survive: no throw, no end.
		for (let tap = 0; tap < 6; tap++) await ball.click({ force: true });
		await expect(ball).toHaveAttribute('data-bounces', '9');
		await expect(page.getByTestId('mini-game-exit')).toBeVisible();

		// The house button comes back to the room.
		await page.getByTestId('mini-game-exit').click();
		await expect(page.getByTestId('mini-game-ball')).toHaveCount(0);
		await expect(page.getByTestId('toys-room')).toBeVisible();

		// Play mode wrote nothing: the save is byte-identical.
		expect(await saveSnapshot(page)).toEqual(before);

		// And the room's house button returns to the title.
		await page.getByTestId('toys-exit').click();
		await expect(page.getByTestId('toys-room')).toHaveCount(0);
		await expect(page.getByTestId('start-button')).toBeVisible();
		expect(await saveSnapshot(page)).toEqual(before);
		expect(errors).toEqual([]);
	});

	test('a repeated dream renders twice — on the strip and in the room', async ({ page }) => {
		const errors = watchForThrows(page);

		// Seed the post-cycle save before the app boots, exactly as the
		// family phone would carry it after wagon → teddy → wagon.
		await page.addInitScript(
			(save: { key: string; value: string }) => localStorage.setItem(save.key, save.value),
			{ key: SAVE_KEY, value: JSON.stringify(CYCLED_SAVE) }
		);
		await page.goto('/?mute=1');
		await expect(page.getByTestId('start-button')).toBeVisible();

		// The title's strip shows every acquisition, the second wagon included.
		const stripWagons = page.getByTestId('owned-toy-wagon');
		await expect(stripWagons).toHaveCount(2);
		await expect(stripWagons.nth(0)).toHaveAttribute('data-index', '0');
		await expect(stripWagons.nth(1)).toHaveAttribute('data-index', '2');
		await expect(page.getByTestId('owned-toy-teddy')).toHaveCount(1);

		// The room renders with no duplicate-key throw: one tile per object.
		await page.getByTestId('toys-door').click();
		await expect(page.getByTestId('toys-room')).toBeVisible();
		await expect(page.getByTestId('toy-wagon')).toHaveCount(2);
		await expect(page.getByTestId('toy-teddy')).toHaveCount(1);
		await expect(page.getByTestId('toy-wagon').nth(1)).toHaveAttribute('data-index', '2');

		expect(errors).toEqual([]);
	});
});
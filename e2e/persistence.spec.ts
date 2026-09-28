import { expect, test } from '@playwright/test';
import {
	completeSetup,
	finishChores,
	finishDay,
	openGame,
	openStore,
	saveDay,
	startMoneyDay,
	tuckIn
} from './helpers';

const SAVE_KEY = 'money-day-save';

/**
 * A v1 save: the durable fields the migration keeps, plus the retired v1 keys
 * it must drop (the old goal and home items, planks, a mid-day phase).
 */
const V1_SAVE = {
	schemaVersion: 1,
	childName: 'Sam',
	nameSkipped: false,
	day: 3,
	goal: 'kite',
	jarCoins: 5,
	homeItems: ['kite'],
	planks: 2,
	phase: 'shelf',
	goalCompletedToday: false,
	savedToday: 2,
	coins: 3,
	tidyDone: 3,
	waterDone: 3,
	fedToday: true,
	gaveToday: 0
};

test.describe('per-device saves and grown-up reset', () => {
	test('a v1 save migrates: name, day, and jar kept; the dream becomes the wagon', async ({
		page
	}) => {
		// Seed the old save before the app boots, exactly as the phone would carry it.
		await page.addInitScript(
			(save: { key: string; value: string }) => localStorage.setItem(save.key, save.value),
			{ key: SAVE_KEY, value: JSON.stringify(V1_SAVE) }
		);
		await openGame(page);

		// Setup is done, the child and the day are still known, and the banner
		// shows the new dream (the wagon) with five of its twelve slots saved.
		await expect(page.getByText('Day 3', { exact: true })).toBeVisible();
		await expect(page.getByTestId('goal-banner')).toHaveAttribute('aria-label', /wagon/);
		await expect(page.locator('[data-testid^="goal-slot-"]')).toHaveCount(12);
		for (let i = 0; i < 5; i++) {
			await expect(page.getByTestId(`goal-slot-${i}`)).toHaveAttribute('data-filled', 'true');
		}
		for (let i = 5; i < 12; i++) {
			await expect(page.getByTestId(`goal-slot-${i}`)).toHaveAttribute('data-filled', 'false');
		}

		// The old home items retired: the strip is empty and My Toys has nothing.
		await expect(page.locator('[data-testid^="owned-toy-"]')).toHaveCount(0);
		await page.getByTestId('toys-door').click();
		await expect(page.getByTestId('toys-empty')).toBeVisible();
		await page.getByTestId('toys-exit').click();

		// The migrated child is greeted by name; the day restarts clean with the
		// jar intact and no coins in hand.
		await expect(page.getByTestId('start-button')).toBeVisible();
		await page.getByTestId('start-button').click();
		await expect(page.getByTestId('greeting-start')).toBeVisible();
		await expect(page.getByText('Sam')).toBeVisible();
		await page.getByTestId('greeting-start').click();
		await expect(page.getByTestId('jar-progress')).toHaveText('5 / 12');
		await expect(page.getByTestId('coin-count')).toHaveText('0');
		await expect(page.getByTestId('day-badge')).toContainText('Day 3');
	});

	test('a corrupt save boots fresh instead of crashing', async ({ page }) => {
		await page.addInitScript((key: string) => localStorage.setItem(key, '{not json'), SAVE_KEY);
		await openGame(page);
		await expect(page.getByTestId('name-input')).toBeVisible();
	});

	test('a save from an unknown schema boots fresh', async ({ page }) => {
		await page.addInitScript(
			(save: { key: string; value: string }) => localStorage.setItem(save.key, save.value),
			{ key: SAVE_KEY, value: JSON.stringify({ schemaVersion: 999, hello: 'world' }) }
		);
		await openGame(page);
		await expect(page.getByTestId('name-input')).toBeVisible();
		await expect(page.getByTestId('start-button')).toHaveCount(0);
	});

	test('progress survives a reload: the jar and the day number', async ({ page }) => {
		await openGame(page);
		await completeSetup(page);
		await startMoneyDay(page);
		await finishDay(page);
		await expect(page.getByTestId('recap-text')).toBeVisible();
		await tuckIn(page);

		await page.reload();

		await completeSetup(page); // already set up: the title comes straight back
		await startMoneyDay(page);
		await expect(page.getByTestId('jar-progress')).toHaveText('4 / 12');
		await expect(page.getByTestId('day-badge')).toContainText('Day 2');
		await expect(page.getByTestId('coin-count')).toHaveText('0');
	});

	test('a bought toy survives a reload and can be played with', async ({ page }) => {
		await openGame(page);
		await completeSetup(page);
		await startMoneyDay(page);
		await finishChores(page);
		await openStore(page);

		// Buy the ball, then send the rest of the day's coins to the dream.
		await page.getByTestId('store-toy-ball').click();
		await expect(page.getByTestId('store-toy-ball')).toHaveAttribute('data-owned', 'true');
		await saveDay(page);
		await expect(page.getByTestId('recap-text')).toBeVisible();
		await tuckIn(page);

		await page.reload();

		// The ball is still on the strip and still sits on the room's rug.
		await completeSetup(page);
		await expect(page.getByTestId('owned-toy-ball')).toBeVisible();
		await page.getByTestId('toys-door').click();
		await expect(page.getByTestId('toy-ball')).toBeVisible();
		await page.getByTestId('toys-exit').click();

		// And the jar kept the two coins the save left in it.
		await startMoneyDay(page);
		await expect(page.getByTestId('jar-progress')).toHaveText('2 / 12');
		await expect(page.getByTestId('day-badge')).toContainText('Day 2');
	});

	test('the grown-up reset wipes everything back to first-run setup', async ({ page }) => {
		await openGame(page);
		await completeSetup(page);
		await startMoneyDay(page);
		await finishDay(page);
		await expect(page.getByTestId('recap-text')).toBeVisible();
		await tuckIn(page);

		await page.getByTestId('open-setup-button').click();
		await page.getByTestId('reset-game-button').click();
		await page.getByTestId('reset-confirm').click();

		await expect(page.getByTestId('name-input')).toBeVisible();
		await page.getByTestId('name-skip').click();
		await page.getByTestId('start-button').click();
		await expect(page.getByTestId('greeting-start')).toBeVisible();
		await expect(page.getByTestId('jar-progress')).toHaveText('0 / 12');
	});
});

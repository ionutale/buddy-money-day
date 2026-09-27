import { expect, test, type Page } from '@playwright/test';
import { completeSetup, finishChores, openGame, openStore, startMoneyDay } from './helpers';

/**
 * The store is the day's decision beat: buy the ball now, or save the rest
 * for the dream. These tests lock the shelf and pedestal, the purchase
 * celebration, and the save-flight's landing spot — the dream banner's
 * slots, never the HUD counter (the Task 1 parked fix).
 *
 * `store-unaffordable` has no play path in v2: the store opens only after
 * all three chores (4 coins), the ball costs 2, and day transients never
 * survive a load. Its copy stays unit-covered in lines.spec.ts; e2e
 * coverage starts in slice 2, when Blocks (6) joins the shelf.
 */

/** Play a whole day and walk through the store door. */
async function walkToStore(page: Page): Promise<void> {
	await openGame(page);
	await completeSetup(page);
	await startMoneyDay(page);
	await finishChores(page);
	await openStore(page);
	await expect(page.getByTestId('store-shelf')).toBeVisible();
}

/**
 * Tap save and read each flying coin's landing point from inside the click's
 * own frame: the flight lives for under a second, so reading the DOM later
 * races its cleanup timer.
 */
async function saveAndReadLandings(page: Page): Promise<{ x: number; y: number }[]> {
	return await page.getByTestId('store-save-button').evaluate(async (button) => {
		(button as HTMLButtonElement).click();
		// Svelte flushes on a microtask; a frame or two is plenty.
		for (let frame = 0; frame < 10; frame++) {
			await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
			const coins = document.querySelectorAll('.flying-coin');
			if (coins.length > 0) {
				return Array.from(coins).map((coin) => {
					const el = coin as HTMLElement;
					const dx = parseFloat(getComputedStyle(el).getPropertyValue('--dx'));
					const dy = parseFloat(getComputedStyle(el).getPropertyValue('--dy'));
					return { x: parseFloat(el.style.left) + dx, y: parseFloat(el.style.top) + dy };
				});
			}
		}
		return [];
	});
}

type Box = { x: number; y: number; width: number; height: number };

/** Whether a point sits inside a bounding box. */
function within(point: { x: number; y: number }, box: Box): boolean {
	return (
		point.x >= box.x &&
		point.x <= box.x + box.width &&
		point.y >= box.y &&
		point.y <= box.y + box.height
	);
}

test.describe('the store', () => {
	test('buying the ball celebrates, then the ball lives in your room', async ({ page }) => {
		await walkToStore(page);

		const ball = page.getByTestId('store-toy-ball');
		await expect(ball).toHaveAttribute('data-owned', 'false');
		await expect(ball.getByRole('img', { name: 'coin' })).toBeVisible();
		await expect(ball).toContainText('2');

		await ball.click();

		// The purchase beat: the ball celebrates before the shelf updates.
		await expect(page.getByTestId('store-buy-beat')).toBeVisible();
		await expect(page.getByTestId('goal-toast')).toContainText("It's in your room!");

		// The beat ends, two coins are spent, and the ball is home.
		await expect(page.getByTestId('store-buy-beat')).toHaveCount(0);
		await expect(ball).toHaveAttribute('data-owned', 'true');
		await expect(ball).toContainText('In your room!');
		await expect(page.getByTestId('coin-count')).toHaveText('2');
	});

	test('saving flies the coins to the dream slots and tucks the day in', async ({ page }) => {
		await walkToStore(page);
		await expect(page.getByTestId('store-save-button')).toContainText(
			'Save the rest for your wagon.'
		);
		await expect(page.getByTestId('coin-count')).toHaveText('4');

		// While choosing, the banner previews the save: four slots lit.
		await expect(page.getByTestId('goal-slot-3')).toHaveAttribute('data-filled', 'true');
		await expect(page.getByTestId('goal-slot-4')).toHaveAttribute('data-filled', 'false');

		const banner = await page.getByTestId('goal-banner').boundingBox();
		const landingSlot = await page.getByTestId('goal-slot-3').boundingBox();
		const counter = await page.getByTestId('coin-count').boundingBox();
		expect(banner).not.toBeNull();
		expect(landingSlot).not.toBeNull();
		expect(counter).not.toBeNull();

		const landings = await saveAndReadLandings(page);

		// One flying coin per saved coin, every one headed for the 4th dream
		// slot — and none of them for the HUD counter.
		expect(landings).toHaveLength(4);
		for (const landing of landings) {
			expect(within(landing, banner!)).toBe(true);
			expect(within(landing, landingSlot!)).toBe(true);
			expect(within(landing, counter!)).toBe(false);
		}

		// The coins land in the jar and the day moves on to tuck-in.
		await expect(page.getByTestId('recap-text')).toBeVisible();
		await expect(page.getByTestId('jar-progress')).toHaveText('4 / 12');
		await expect(page.getByTestId('coin-count')).toHaveText('0');
	});

	test('the dream pedestal shows the dream and its progress', async ({ page }) => {
		await walkToStore(page);

		const dream = page.getByTestId('store-dream');
		await expect(dream).toBeVisible();
		await expect(dream).toContainText('wagon');
		await expect(dream).toContainText('0 / 12');
		await expect(dream.getByRole('img', { name: 'wagon' })).toBeVisible();
	});
});

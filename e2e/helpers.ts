import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Shared playthrough helpers. Playwright gives every test a fresh browser
 * context, so each test starts with an empty save. `?mute=1` keeps the
 * speech synthesis out of the test runs.
 */

export async function openGame(page: Page): Promise<void> {
	await page.goto('/?mute=1');
	await expect(page.getByTestId('name-input').or(page.getByTestId('start-button'))).toBeVisible();
}

/** First run: a parent types the child's name (or it was already skipped). */
export async function completeSetup(page: Page, name = 'Sam'): Promise<void> {
	const nameInput = page.getByTestId('name-input');
	const startButton = page.getByTestId('start-button');
	// The app may still be rendering — a slow first load must never be
	// mistaken for an already-completed setup (this raced on the live site).
	await expect(nameInput.or(startButton)).toBeVisible();
	if (await nameInput.isVisible()) {
		await nameInput.fill(name);
		await page.getByTestId('name-submit').click();
	}
	await expect(startButton).toBeVisible();
}

/**
 * From the title screen, begin a Money Day and arrive at the job board. Works
 * for the first day and every next one alike — the loop is the same.
 */
async function arriveAtJobBoard(page: Page): Promise<void> {
	// Continue buttons sit inside continuously animated scenes; force taps skip
	// Playwright's stability gate, exactly like the bobbing water drops.
	await page.getByTestId('start-button').click({ force: true });
	await expect(page.getByTestId('greeting-start')).toBeVisible();
	await page.getByTestId('greeting-start').click({ force: true });
	await expect(page.getByTestId('job-board')).toBeVisible();
}

export async function startMoneyDay(page: Page): Promise<void> {
	await arriveAtJobBoard(page);
}

export async function dragLocator(page: Page, from: Locator, to: Locator): Promise<void> {
	const fb = await from.boundingBox();
	const tb = await to.boundingBox();
	if (!fb || !tb) throw new Error('cannot drag: element has no bounding box');
	await page.mouse.move(fb.x + fb.width / 2, fb.y + fb.height / 2);
	await page.mouse.down();
	await page.mouse.move(tb.x + tb.width / 2, tb.y + tb.height / 2, { steps: 12 });
	await page.mouse.up();
}

export async function tidyAllToys(page: Page): Promise<void> {
	const box = page.getByTestId('tidy-box');
	for (const i of [0, 1, 2]) {
		const toy = page.getByTestId(`toy-${i}`);
		await expect(toy).toBeVisible();
		await dragLocator(page, toy, box);
	}
}

export async function waterAllDrops(page: Page): Promise<void> {
	// The drops bob idly, so Playwright's "element is stable" gate never
	// passes; force clicks target the current position, like a real tap.
	for (const i of [0, 1, 2]) {
		await page.getByTestId(`drop-${i}`).click({ force: true });
	}
}

export async function feedAllSnacks(page: Page): Promise<void> {
	const bowl = page.getByTestId('bear-bowl');
	for (const i of [0, 1, 2]) {
		const snack = page.getByTestId(`feed-snack-${i}`);
		await expect(snack).toBeVisible();
		await dragLocator(page, snack, bowl);
	}
}

export type Chore = 'tidy' | 'water' | 'feed';

/**
 * Play one chore from the job board and wait until it lands: the board is
 * back and its card is checked. Tidy drags its toys to the box; water taps
 * its drops; feed drags its three snacks into the bear's bowl.
 */
export async function doChore(page: Page, chore: Chore): Promise<void> {
	await page.getByTestId(`job-card-${chore}`).click();
	if (chore === 'tidy') {
		await tidyAllToys(page);
	} else if (chore === 'water') {
		await waterAllDrops(page);
	} else {
		await feedAllSnacks(page);
	}
	await expect(page.getByTestId('job-board')).toBeVisible();
	await expect(page.getByTestId(`job-card-${chore}`)).toHaveAttribute('data-done', 'true');
}

export async function tuckIn(page: Page): Promise<void> {
	await expect(page.getByTestId('tuckin-done')).toBeVisible();
	await page.getByTestId('tuckin-done').click();
	await expect(page.getByTestId('start-button')).toBeVisible();
}

/** Play the whole day's work from the job board: all three chores, any order. */
export async function finishChores(page: Page): Promise<void> {
	for (const chore of ['tidy', 'water', 'feed'] as const) await doChore(page, chore);
}

/** Walk through the store door once the board is done. */
export async function openStore(page: Page): Promise<void> {
	await page.getByTestId('to-store-button').click();
}

/** Send every coin in hand to the jar — the store's default path. */
export async function saveDay(page: Page): Promise<void> {
	await page.getByTestId('store-save-button').click();
}

/** A whole day's work, saved: the standard route from board to tuck-in. */
export async function finishDay(page: Page): Promise<void> {
	await finishChores(page);
	await openStore(page);
	await saveDay(page);
}

/** From the start screen, begin the next Money Day and arrive at the job board. */
export async function nextDay(page: Page): Promise<void> {
	await arriveAtJobBoard(page);
}

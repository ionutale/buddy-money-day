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
	if (await nameInput.isVisible()) {
		await nameInput.fill(name);
		await page.getByTestId('name-submit').click();
	}
	await expect(page.getByTestId('start-button')).toBeVisible();
}

export async function startMoneyDay(page: Page): Promise<void> {
	await page.getByTestId('start-button').click();
	await expect(page.getByTestId('greeting-start')).toBeVisible();
	await page.getByTestId('greeting-start').click();
	await expect(page.getByTestId('toy-0')).toBeVisible();
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
	await expect(page.getByTestId('drop-0')).toBeVisible();
}

export async function waterAllDrops(page: Page): Promise<void> {
	// The drops bob idly, so Playwright's "element is stable" gate never
	// passes; force clicks target the current position, like a real tap.
	for (const i of [0, 1, 2]) {
		await page.getByTestId(`drop-${i}`).click({ force: true });
	}
	await expect(page.getByTestId('hunger-skip')).toBeVisible();
}

export type DayChoices = {
	feed: 'feed' | 'skip';
	give?: number; // coins to the bird, 0..3
	spend?: 'save' | 'lollipop';
};

/** Play one whole Money Day up to (not including) the tuck-in. */
export async function playDay(page: Page, choices: DayChoices): Promise<void> {
	const { feed, give = 0, spend = 'save' } = choices;

	await tidyAllToys(page);
	await waterAllDrops(page);

	if (feed === 'feed') {
		await page.getByTestId('hunger-feed').click();
	} else {
		await page.getByTestId('hunger-skip').click();
	}
	await expect(page.getByTestId('friend-done')).toBeVisible();
	for (let i = 0; i < give; i++) {
		await page.getByTestId('friend-give').click();
	}
	await page.getByTestId('friend-done').click();

	await expect(page.getByTestId('shelf-save')).toBeVisible();
	if (spend === 'lollipop') {
		// The offered lollipop wobbles forever; force clicks tap its current spot.
		await page.getByTestId('shelf-lollipop').click({ force: true });
		await expect(page.getByTestId('lollipop-bought')).toBeVisible();
		await page.getByTestId('lollipop-continue').click();
	} else {
		await page.getByTestId('shelf-save').click();
	}

	await expect(page.getByTestId('jars-continue')).toBeVisible();
	await page.getByTestId('jars-continue').click();
}

export async function tuckIn(page: Page): Promise<void> {
	await expect(page.getByTestId('tuckin-done')).toBeVisible();
	await page.getByTestId('tuckin-done').click();
	await expect(page.getByTestId('start-button')).toBeVisible();
}

/** From the start screen, begin the next Money Day and arrive at the toys. */
export async function nextDay(page: Page): Promise<void> {
	await page.getByTestId('start-button').click();
	await expect(page.getByTestId('greeting-start')).toBeVisible();
	await page.getByTestId('greeting-start').click();
	await expect(page.getByTestId('toy-0')).toBeVisible();
}

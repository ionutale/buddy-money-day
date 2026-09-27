import { expect, test } from '@playwright/test';
import { completeSetup, openGame } from './helpers';

test.describe('first run', () => {
	test('a parent can set the name once, and the name is used in the greeting', async ({
		page
	}) => {
		await openGame(page);
		await completeSetup(page, 'Sam');

		await page.getByTestId('start-button').click();
		await expect(page.getByTestId('greeting-start')).toBeVisible();
		await expect(page.getByText('Sam')).toBeVisible();
		await expect(page.getByTestId('buddy')).toBeVisible();
		await page.getByTestId('greeting-start').click();
		await expect(page.getByTestId('toy-0')).toBeVisible();
	});

	test('the setup does not appear again on the next visit', async ({ page }) => {
		await openGame(page);
		await completeSetup(page, 'Sam');

		await page.reload();

		await expect(page.getByTestId('start-button')).toBeVisible();
		await expect(page.getByTestId('name-input')).toHaveCount(0);
	});

	test('skipping the name still lets the whole game be played', async ({ page }) => {
		await openGame(page);
		await page.getByTestId('name-skip').click();
		await expect(page.getByTestId('start-button')).toBeVisible();
		await page.getByTestId('start-button').click();
		await expect(page.getByTestId('greeting-start')).toBeVisible();
		await expect(page.getByText('friend')).toBeVisible();
		await page.getByTestId('greeting-start').click();
		await expect(page.getByTestId('toy-0')).toBeVisible();
	});
});

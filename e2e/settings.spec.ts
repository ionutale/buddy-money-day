import { expect, test } from '@playwright/test';
import { completeSetup, openGame } from './helpers';

/**
 * Voice lives in Grown-up Setup and persists per device, deliberately
 * separate from the game save. These tests stub speech synthesis so
 * "was anything spoken, and with which actor?" is observable without audio.
 */
test.describe('grown-up settings: voice', () => {
	test('turning voice off silences Buddy but keeps the text bubbles', async ({ page }) => {
		await page.addInitScript(() => {
			const spoken: string[] = [];
			(window as unknown as { __spoken: string[] }).__spoken = spoken;
			// Record at construction time: even if the real synth rejects the
			// fake utterance, the attempt itself is the evidence.
			class FakeUtterance {
				text: string;
				rate = 1;
				pitch = 1;
				constructor(text: string) {
					this.text = text;
					spoken.push(text);
				}
			}
			try {
				Object.defineProperty(window, 'SpeechSynthesisUtterance', {
					configurable: true,
					value: FakeUtterance
				});
			} catch {
				/* keep the real one */
			}
			try {
				Object.defineProperty(window, 'speechSynthesis', {
					configurable: true,
					value: {
						speak: () => {},
						cancel: () => {},
						getVoices: () => [],
						addEventListener: () => {},
						removeEventListener: () => {},
						speaking: false,
						pending: false,
						paused: false
					}
				});
			} catch {
				/* keep the real one */
			}
		});

		// No ?mute=1 here: this test exercises the real voice path.
		await page.goto('/');
		await completeSetup(page);

		// Voice is on by default, so setup has already spoken.
		await expect
			.poll(() =>
				page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken.length)
			)
			.toBeGreaterThan(0);

		// Turn voice off in Grown-up Setup.
		await page.getByTestId('open-setup-button').click();
		await expect(page.getByTestId('voice-toggle')).toHaveAttribute('aria-checked', 'true');
		await page.getByTestId('voice-toggle').click();
		await expect(page.getByTestId('voice-toggle')).toHaveAttribute('aria-checked', 'false');
		await page.getByTestId('setup-close-button').click();

		const before = await page.evaluate(
			() => (window as unknown as { __spoken: string[] }).__spoken.length
		);

		// A new scene still shows its words — but speaks nothing.
		await page.getByTestId('start-button').click();
		await expect(page.getByTestId('greeting-start')).toBeVisible();
		await expect(page.getByText(/Good morning/)).toBeVisible();
		await page.waitForTimeout(400);
		const after = await page.evaluate(
			() => (window as unknown as { __spoken: string[] }).__spoken.length
		);
		expect(after).toBe(before);

		// The grown-up's choice survives a reload.
		await page.reload();
		await page.getByTestId('open-setup-button').click();
		await expect(page.getByTestId('voice-toggle')).toHaveAttribute('aria-checked', 'false');
	});

	test('a grown-up can pick which actor voices Buddy, and the choice sticks', async ({
		page
	}) => {
		await page.addInitScript(() => {
			const spoken: string[] = [];
			(window as unknown as { __spoken: string[] }).__spoken = spoken;
			(window as unknown as { __lastVoice: string | null }).__lastVoice = null;
			const voices = [
				{ voiceURI: 'voice-bella', name: 'Bella', lang: 'en-US', default: true, localService: true },
				{ voiceURI: 'voice-rex', name: 'Rex', lang: 'en-GB', default: false, localService: true },
				{ voiceURI: 'voice-amelie', name: 'Amelie', lang: 'fr-FR', default: false, localService: true }
			];
			class FakeUtterance {
				text: string;
				rate = 1;
				pitch = 1;
				voice: unknown = null;
				constructor(text: string) {
					this.text = text;
					spoken.push(text);
				}
			}
			Object.defineProperty(window, 'SpeechSynthesisUtterance', {
				configurable: true,
				value: FakeUtterance
			});
			Object.defineProperty(window, 'speechSynthesis', {
				configurable: true,
				value: {
					getVoices: () => voices,
					speak: (utterance: { voice?: { voiceURI?: string } | null }) => {
						(window as unknown as { __lastVoice: string | null }).__lastVoice = utterance.voice
							? (utterance.voice.voiceURI ?? null)
							: null;
					},
					cancel: () => {},
					addEventListener: () => {},
					removeEventListener: () => {},
					speaking: false,
					pending: false,
					paused: false
				}
			});
		});

		await page.goto('/');
		await completeSetup(page);
		await page.getByTestId('open-setup-button').click();

		// English actors only — Amelie (fr-FR) is filtered out.
		await expect(page.getByTestId('voice-option-default')).toBeVisible();
		await expect(page.getByTestId('voice-option-0')).toContainText('Bella');
		await expect(page.getByTestId('voice-option-1')).toContainText('Rex');
		await expect(page.getByTestId('voice-option-2')).toHaveCount(0);

		// Picking Rex both selects it and previews Buddy in that actor's voice.
		await page.getByTestId('voice-option-1').click();
		await expect(page.getByTestId('voice-option-1')).toHaveAttribute('aria-checked', 'true');
		expect(
			await page.evaluate(() => (window as unknown as { __lastVoice: string | null }).__lastVoice)
		).toBe('voice-rex');

		// The choice survives a reload; System default can take it back.
		await page.reload();
		await page.getByTestId('open-setup-button').click();
		await expect(page.getByTestId('voice-option-1')).toHaveAttribute('aria-checked', 'true');
		await page.getByTestId('voice-option-default').click();
		await expect(page.getByTestId('voice-option-default')).toHaveAttribute('aria-checked', 'true');
		expect(
			await page.evaluate(() => (window as unknown as { __lastVoice: string | null }).__lastVoice)
		).toBe(null);
	});

	test('starting the game over keeps the voice setting', async ({ page }) => {
		await openGame(page);
		await completeSetup(page);

		await page.getByTestId('open-setup-button').click();
		await page.getByTestId('voice-toggle').click();
		await expect(page.getByTestId('voice-toggle')).toHaveAttribute('aria-checked', 'false');

		await page.getByTestId('reset-game-button').click();
		await page.getByTestId('reset-confirm').click();

		// Back at first-run setup, but the voice choice has not moved.
		await expect(page.getByTestId('name-input')).toBeVisible();
		await expect(page.getByTestId('voice-toggle')).toHaveAttribute('aria-checked', 'false');
	});
});

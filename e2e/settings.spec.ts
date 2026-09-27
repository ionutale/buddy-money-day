import { expect, test, type Page } from '@playwright/test';
import { completeSetup } from './helpers';

/**
 * Voice lives in Grown-up Setup, is off on a fresh install, and persists per
 * device — deliberately separate from the game save. These tests stub speech
 * synthesis so "was anything spoken, and with which actor?" is observable
 * without audio. Text bubbles keep every word either way.
 */

type StubVoice = {
	voiceURI: string;
	name: string;
	lang: string;
	default: boolean;
	localService: boolean;
};

/** Minimal fake of the Web Speech API; records utterances as they are built. */
async function installSpeechStub(page: Page, voices: StubVoice[] = []): Promise<void> {
	await page.addInitScript((stubVoices: StubVoice[]) => {
		const spoken: string[] = [];
		(window as unknown as { __spoken: string[] }).__spoken = spoken;
		(window as unknown as { __lastVoice: string | null }).__lastVoice = null;
		class FakeUtterance {
			text: string;
			rate = 1;
			pitch = 1;
			voice: unknown = null;
			constructor(text: string) {
				this.text = text;
				// Record at construction time: even if the real synth rejects the
				// fake utterance, the attempt itself is the evidence.
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
					getVoices: () => stubVoices,
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
		} catch {
			/* keep the real one */
		}
	}, voices);
}

function spokenCount(page: Page): Promise<number> {
	return page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken.length);
}

function lastVoice(page: Page): Promise<string | null> {
	return page.evaluate(() => (window as unknown as { __lastVoice: string | null }).__lastVoice);
}

function storedSettings(
	page: Page
): Promise<{ voiceEnabled: boolean; voiceURI: string | null } | null> {
	return page.evaluate(() => {
		const raw = localStorage.getItem('money-day-settings');
		return raw === null ? null : JSON.parse(raw);
	});
}

const ENGLISH_VOICES: StubVoice[] = [
	{ voiceURI: 'voice-bella', name: 'Bella', lang: 'en-US', default: true, localService: true },
	{ voiceURI: 'voice-rex', name: 'Rex', lang: 'en-GB', default: false, localService: true },
	{ voiceURI: 'voice-amelie', name: 'Amelie', lang: 'fr-FR', default: false, localService: true }
];

test.describe('grown-up settings: voice', () => {
	test('a fresh install is silent; the switch turns voice on and it sticks', async ({ page }) => {
		await installSpeechStub(page);

		// No ?mute=1 here: this test exercises the real voice path.
		await page.goto('/');

		// First run: silent, with the switch OFF and no actor picker.
		await expect(page.getByTestId('name-input')).toBeVisible();
		await expect(page.getByTestId('voice-toggle')).toHaveAttribute('aria-checked', 'false');
		await expect(page.getByTestId('voice-option-default')).toHaveCount(0);
		expect(await spokenCount(page)).toBe(0);

		await completeSetup(page);
		expect(await spokenCount(page)).toBe(0);

		// Turn voice on in Grown-up Setup; flipping the switch is itself audible.
		await page.getByTestId('open-setup-button').click();
		await page.getByTestId('voice-toggle').click();
		await expect(page.getByTestId('voice-toggle')).toHaveAttribute('aria-checked', 'true');
		await expect.poll(() => spokenCount(page)).toBeGreaterThan(0);
		await page.getByTestId('setup-close-button').click();

		// A new scene now speaks — and its text bubble still carries the words.
		const before = await spokenCount(page);
		await page.getByTestId('start-button').click({ force: true });
		await expect(page.getByTestId('greeting-start')).toBeVisible();
		await expect(page.getByText(/Good morning/)).toBeVisible();
		await expect.poll(() => spokenCount(page)).toBeGreaterThan(before);

		// The choice survives a reload: the stored preference wins over the default.
		await page.reload();
		await page.getByTestId('open-setup-button').click();
		await expect(page.getByTestId('voice-toggle')).toHaveAttribute('aria-checked', 'true');
		expect(await storedSettings(page)).toEqual({ voiceEnabled: true, voiceURI: null });
	});

	test('the actor picker is gated behind voice; a pick sticks, System default restores', async ({
		page
	}) => {
		await installSpeechStub(page, ENGLISH_VOICES);

		await page.goto('/');
		await completeSetup(page);
		await page.getByTestId('open-setup-button').click();

		// Voice off (the default): nothing to pick from.
		await expect(page.getByTestId('voice-toggle')).toHaveAttribute('aria-checked', 'false');
		await expect(page.getByTestId('voice-option-default')).toHaveCount(0);

		// Turning voice on reveals the device's English actors only.
		await page.getByTestId('voice-toggle').click();
		await expect(page.getByTestId('voice-option-default')).toBeVisible();
		await expect(page.getByTestId('voice-option-0')).toContainText('Bella');
		await expect(page.getByTestId('voice-option-1')).toContainText('Rex');
		await expect(page.getByTestId('voice-option-2')).toHaveCount(0); // Amelie is fr-FR

		// Picking Rex selects it and previews Buddy in that actor's voice.
		await page.getByTestId('voice-option-1').click();
		await expect(page.getByTestId('voice-option-1')).toHaveAttribute('aria-checked', 'true');
		await expect.poll(() => lastVoice(page)).toBe('voice-rex');
		expect(await storedSettings(page)).toEqual({ voiceEnabled: true, voiceURI: 'voice-rex' });

		// The pick survives a reload with voice still on.
		await page.reload();
		await page.getByTestId('open-setup-button').click();
		await expect(page.getByTestId('voice-toggle')).toHaveAttribute('aria-checked', 'true');
		await expect(page.getByTestId('voice-option-1')).toHaveAttribute('aria-checked', 'true');

		// System default takes it back.
		await page.getByTestId('voice-option-default').click();
		await expect(page.getByTestId('voice-option-default')).toHaveAttribute('aria-checked', 'true');
		await expect.poll(() => lastVoice(page)).toBe(null);
		expect(await storedSettings(page)).toEqual({ voiceEnabled: true, voiceURI: null });

		// Turning voice off hides the picker again.
		await page.getByTestId('voice-toggle').click();
		await expect(page.getByTestId('voice-option-default')).toHaveCount(0);
	});

	test('starting the game over keeps the voice choice', async ({ page }) => {
		await installSpeechStub(page);
		await page.goto('/');
		await completeSetup(page);

		await page.getByTestId('open-setup-button').click();
		await page.getByTestId('voice-toggle').click();
		await expect(page.getByTestId('voice-toggle')).toHaveAttribute('aria-checked', 'true');

		await page.getByTestId('reset-game-button').click();
		await page.getByTestId('reset-confirm').click();

		// Back at first-run setup, but the voice choice has not moved.
		await expect(page.getByTestId('name-input')).toBeVisible();
		await expect(page.getByTestId('voice-toggle')).toHaveAttribute('aria-checked', 'true');
		expect(await storedSettings(page)).toEqual({ voiceEnabled: true, voiceURI: null });
	});
});

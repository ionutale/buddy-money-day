import { defaultStorage, type StorageLike } from './persistence';

/**
 * Parent-facing, per-device preferences. Deliberately NOT part of GameState:
 * starting the game over must never re-enable a voice the grown-up turned off.
 */

export const SETTINGS_KEY = 'money-day-settings';

export type Settings = {
	/** When false the game stays silent; text bubbles always keep the words. */
	voiceEnabled: boolean;
	/**
	 * voiceURI of the chosen speech-synthesis actor; null = the device's
	 * default voice. Actors are device-provided, so the choice is stored by
	 * URI and silently falls back to the default if that voice disappears.
	 */
	voiceURI: string | null;
};

export const DEFAULT_SETTINGS: Settings = { voiceEnabled: true, voiceURI: null };

function isVoiceURI(value: unknown): value is string | null {
	return value === null || typeof value === 'string';
}

export function loadSettings(storage: StorageLike = defaultStorage()): Settings {
	try {
		const raw = storage.getItem(SETTINGS_KEY);
		if (raw === null) return { ...DEFAULT_SETTINGS };
		const parsed: unknown = JSON.parse(raw);
		if (typeof parsed !== 'object' || parsed === null) return { ...DEFAULT_SETTINGS };
		const stored = parsed as Record<string, unknown>;
		if (typeof stored.voiceEnabled !== 'boolean') return { ...DEFAULT_SETTINGS };
		return {
			voiceEnabled: stored.voiceEnabled,
			voiceURI: isVoiceURI(stored.voiceURI) ? stored.voiceURI : null
		};
	} catch {
		return { ...DEFAULT_SETTINGS };
	}
}

export function saveSettings(settings: Settings, storage: StorageLike = defaultStorage()): void {
	try {
		storage.setItem(SETTINGS_KEY, JSON.stringify(settings));
	} catch {
		/* storage unavailable — the preference simply does not persist */
	}
}

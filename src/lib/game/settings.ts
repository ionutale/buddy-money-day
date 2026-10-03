import { defaultStorage, type StorageLike } from './persistence';

/**
 * Parent-facing, per-device preferences. Deliberately NOT part of GameState:
 * starting the game over must never re-enable a voice the grown-up turned off.
 */

export const SETTINGS_KEY = 'money-day-settings';

export type Settings = {
	/**
	 * When false the game stays silent; text bubbles always keep the words.
	 * New installs are silent — a grown-up turns voice on in Setup. A stored
	 * preference always wins over this default.
	 */
	voiceEnabled: boolean;
};

export const DEFAULT_SETTINGS: Settings = { voiceEnabled: false };

export function loadSettings(storage: StorageLike = defaultStorage()): Settings {
	try {
		const raw = storage.getItem(SETTINGS_KEY);
		if (raw === null) return { ...DEFAULT_SETTINGS };
		const parsed: unknown = JSON.parse(raw);
		if (typeof parsed !== 'object' || parsed === null) return { ...DEFAULT_SETTINGS };
		const stored = parsed as Record<string, unknown>;
		if (typeof stored.voiceEnabled !== 'boolean') return { ...DEFAULT_SETTINGS };
		// Older saves may carry `voiceURI` (the retired actor picker); ignored.
		return { voiceEnabled: stored.voiceEnabled };
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

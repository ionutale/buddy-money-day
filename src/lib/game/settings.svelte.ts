import { loadSettings, saveSettings, type Settings } from './settings';

/**
 * The one mutable copy of the grown-up preferences, persisted per device.
 * Kept separate from the game save on purpose (see settings.ts).
 */
export const settings = $state<Settings>(loadSettings());

export function setVoiceEnabled(value: boolean): void {
	settings.voiceEnabled = value;
	saveSettings(settings);
}

/** Flips the switch and returns the new value. */
export function toggleVoice(): boolean {
	setVoiceEnabled(!settings.voiceEnabled);
	return settings.voiceEnabled;
}

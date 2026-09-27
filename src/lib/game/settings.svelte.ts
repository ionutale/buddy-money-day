import { loadSettings, saveSettings, type Settings } from './settings';

/**
 * The one mutable copy of the grown-up preferences, persisted per device.
 * Kept separate from the game save on purpose (see settings.ts).
 */
export const settings = $state<Settings>(loadSettings());

/** The device's English speech voices as plain data, for the actor picker. */
export const voiceOptions = $state<{ list: VoiceOption[] }>({ list: [] });

export type VoiceOption = { uri: string; name: string; lang: string };

export function setVoiceEnabled(value: boolean): void {
	settings.voiceEnabled = value;
	saveSettings(settings);
}

/** Flips the switch and returns the new value. */
export function toggleVoice(): boolean {
	setVoiceEnabled(!settings.voiceEnabled);
	return settings.voiceEnabled;
}

export function setVoiceURI(voiceURI: string | null): void {
	settings.voiceURI = voiceURI;
	saveSettings(settings);
}

/**
 * Safe without speech support and before voices finish loading: phone voice
 * lists arrive asynchronously (and the picker refreshes on `voiceschanged`).
 * English-only, deduplicated by voiceURI — the game speaks English.
 */
export function refreshVoices(): void {
	try {
		if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
		const seen = new Set<string>();
		const list: VoiceOption[] = [];
		for (const voice of window.speechSynthesis.getVoices()) {
			if (!voice.lang.toLowerCase().startsWith('en')) continue;
			if (seen.has(voice.voiceURI)) continue;
			seen.add(voice.voiceURI);
			list.push({ uri: voice.voiceURI, name: voice.name, lang: voice.lang });
		}
		list.sort((a, b) => a.name.localeCompare(b.name));
		voiceOptions.list = list;
	} catch {
		/* voices are optional, never fatal */
	}
}

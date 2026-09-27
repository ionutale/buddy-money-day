import { settings } from './settings.svelte';

/**
 * Buddy's voice. Fire-and-forget: every call cancels the previous line and
 * speaks the new one — nothing ever awaits. Silent when the grown-up turned
 * Voice off in Grown-up Setup, when `?mute=1` is in the URL, or in browsers
 * without speech synthesis. Text bubbles always keep the words.
 */

function isMutedByQuery(): boolean {
	try {
		return typeof location !== 'undefined' && location.search.includes('mute=1');
	} catch {
		return false;
	}
}

function hasSpeech(): boolean {
	return (
		typeof window !== 'undefined' &&
		'speechSynthesis' in window &&
		typeof SpeechSynthesisUtterance !== 'undefined'
	);
}

function voiceAllowed(): boolean {
	return settings.voiceEnabled && !isMutedByQuery() && hasSpeech();
}

export function cancelSpeech(): void {
	if (!hasSpeech()) return;
	try {
		window.speechSynthesis.cancel();
	} catch {
		/* voice is optional, never fatal */
	}
}

/** Cancel-then-speak. Never throws, never blocks. */
export function speak(text: string): void {
	if (!voiceAllowed() || text === '') return;
	try {
		const synth = window.speechSynthesis;
		synth.cancel();
		const line = new SpeechSynthesisUtterance(text);
		line.rate = 0.92;
		line.pitch = 1.12;
		const chosen = settings.voiceURI;
		if (chosen) {
			// The chosen actor may have vanished (another phone, an OS update):
			// fall back to the device default instead of failing.
			const voice = synth.getVoices().find((v) => v.voiceURI === chosen);
			if (voice) line.voice = voice;
		}
		synth.speak(line);
	} catch {
		/* voice is optional, never fatal */
	}
}

/**
 * Buddy's voice. Fire-and-forget: every call cancels the previous line and
 * speaks the new one — nothing ever awaits. Voice is disabled with
 * `?mute=1` or in browsers without speech synthesis, and can be toggled
 * at runtime for tests via setVoiceEnabled().
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

let enabled = hasSpeech() && !isMutedByQuery();

/** Tests and grown-ups can silence or re-enable voice at runtime. */
export function setVoiceEnabled(value: boolean): void {
	enabled = value;
	if (!value) cancelSpeech();
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
	if (!enabled || text === '' || !hasSpeech()) return;
	try {
		const synth = window.speechSynthesis;
		synth.cancel();
		const line = new SpeechSynthesisUtterance(text);
		line.rate = 0.92;
		line.pitch = 1.12;
		synth.speak(line);
	} catch {
		/* voice is optional, never fatal */
	}
}

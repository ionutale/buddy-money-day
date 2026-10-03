import { base } from '$app/paths';
import { settings } from './settings.svelte';
import { voiceMap } from './voice-map';

/**
 * Buddy's voice, played from bundled audio. Fire-and-forget: every call cancels
 * the previous line and plays the new one's fragments in order. Silent when the
 * grown-up turned Voice off, when `?mute=1` is in the URL, or when a clip is
 * missing or blocked. Text bubbles always keep the words.
 */

type AudioLike = {
	src: string;
	preload: string;
	onended: (() => void) | null;
	onerror: (() => void) | null;
	play: () => Promise<void> | void;
	pause: () => void;
};

function isMutedByQuery(): boolean {
	try {
		return typeof location !== 'undefined' && location.search.includes('mute=1');
	} catch {
		return false;
	}
}

function voiceAllowed(): boolean {
	return settings.voiceEnabled && !isMutedByQuery();
}

function urlFor(text: string): string | null {
	const id = voiceMap[text];
	return id ? `${base}/voice/${id}.mp3` : null;
}

let playing: AudioLike[] | null = null;

/** Stop whatever is speaking. Never throws. */
export function cancelSpeech(): void {
	if (!playing) return;
	for (const clip of playing) {
		try {
			clip.onended = null;
			clip.onerror = null;
			clip.pause();
		} catch {
			/* voice is optional, never fatal */
		}
	}
	playing = null;
}

function makeAudio(url: string): AudioLike | null {
	try {
		if (typeof Audio === 'undefined') return null;
		const clip = new Audio(url) as unknown as AudioLike;
		clip.preload = 'auto';
		return clip;
	} catch {
		return null;
	}
}

/** Cancel-then-speak a sequence of fragments. Never throws, never blocks. */
export function speakFragments(texts: string[]): void {
	if (!voiceAllowed()) return;
	const clips: AudioLike[] = [];
	for (const text of texts) {
		const url = urlFor(text);
		if (!url) continue;
		const clip = makeAudio(url);
		if (clip) clips.push(clip);
	}
	if (clips.length === 0) return;
	cancelSpeech();
	playing = clips;

	let index = 0;
	const playNext = (): void => {
		const clip = clips[index++];
		if (!clip) {
			playing = null;
			return;
		}
		clip.onended = playNext;
		clip.onerror = playNext;
		try {
			const started = clip.play();
			if (started && typeof started.catch === 'function') {
				// Autoplay blocked (pre-gesture) or decode error: stay silent.
				started.catch(() => undefined);
			}
		} catch {
			/* voice is optional, never fatal */
		}
	};
	playNext();
}

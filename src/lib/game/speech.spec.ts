import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockSettings } = vi.hoisted(() => ({ mockSettings: { voiceEnabled: true } }));

vi.mock('./settings.svelte', () => ({ settings: mockSettings }));
vi.mock('$app/paths', () => ({ base: '' }));
vi.mock('./voice-map', () => ({
	voiceMap: { 'Good morning!': 'id-greet', PLAN: 'id-plan' }
}));

import { cancelSpeech, speakFragments } from './speech';

class FakeAudio {
	static instances: FakeAudio[] = [];
	src: string;
	onended: (() => void) | null = null;
	onerror: (() => void) | null = null;
	preload = '';
	played = false;
	paused = false;
	constructor(src: string) {
		this.src = src;
		FakeAudio.instances.push(this);
	}
	play(): Promise<void> {
		this.played = true;
		return Promise.resolve();
	}
	pause(): void {
		this.paused = true;
	}
	end(): void {
		this.onended?.();
	}
}

function srcs(): string[] {
	return FakeAudio.instances.map((a) => a.src);
}

beforeEach(() => {
	FakeAudio.instances = [];
	mockSettings.voiceEnabled = true;
	vi.stubGlobal('Audio', FakeAudio);
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('the voice player', () => {
	it('plays fragments in order', () => {
		speakFragments(['Good morning!', 'PLAN']);
		expect(srcs()).toEqual(['/voice/id-greet.mp3', '/voice/id-plan.mp3']);
		expect(FakeAudio.instances[0].played).toBe(true);
		expect(FakeAudio.instances[1].played).toBe(false);
		FakeAudio.instances[0].end();
		expect(FakeAudio.instances[1].played).toBe(true);
	});

	it('skips fragments with no clip instead of throwing', () => {
		expect(() => speakFragments(['no such line'])).not.toThrow();
		expect(FakeAudio.instances).toHaveLength(0);
	});

	it('does nothing for an empty fragment list', () => {
		speakFragments([]);
		expect(FakeAudio.instances).toHaveLength(0);
	});

	it('stays silent when voice is off', () => {
		mockSettings.voiceEnabled = false;
		speakFragments(['Good morning!']);
		expect(FakeAudio.instances).toHaveLength(0);
	});

	it('stays silent under ?mute=1 even with voice on', () => {
		vi.stubGlobal('location', { search: '?mute=1' });
		speakFragments(['Good morning!']);
		expect(FakeAudio.instances).toHaveLength(0);
	});

	it('cancels the previous line, never overlapping', () => {
		speakFragments(['Good morning!', 'PLAN']);
		const first = FakeAudio.instances[0];
		speakFragments(['PLAN']);
		expect(first.paused).toBe(true);
		first.end();
		// The cancelled line does not advance into its second fragment.
		expect(FakeAudio.instances.filter((a) => a.played && a.src === '/voice/id-plan.mp3'))
			.toHaveLength(1);
	});

	it('never throws when Audio is unavailable', () => {
		vi.stubGlobal('Audio', undefined);
		expect(() => speakFragments(['Good morning!'])).not.toThrow();
	});

	it('cancelSpeech is safe with nothing playing', () => {
		expect(() => cancelSpeech()).not.toThrow();
	});
});

import { describe, expect, it } from 'vitest';
import { collectFragments } from './voiceCatalogue';
import { voiceMap } from './voice-map';

describe('the generated voice map', () => {
	it('maps every reachable fragment to a clip id', () => {
		for (const text of collectFragments()) {
			expect(voiceMap[text], text).toMatch(/^[0-9a-f]{10}$/);
		}
	});

	it('has no entries the catalogue cannot produce', () => {
		const reachable = new Set(collectFragments());
		for (const text of Object.keys(voiceMap)) {
			expect(reachable.has(text), text).toBe(true);
		}
	});

	it('assigns each text a unique id', () => {
		const ids = Object.values(voiceMap);
		expect(new Set(ids).size).toBe(ids.length);
	});
});

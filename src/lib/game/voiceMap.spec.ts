import { describe, expect, it } from 'vitest';
import { collectFragments } from './voiceCatalogue';
import { voiceMap } from './voice-map';

/**
 * sha1(text) truncated to 10 hex chars, matching scripts/build-voice-lines.ts.
 * Computed with Web Crypto rather than node:crypto so this browser-oriented
 * project needs no @types/node (none is installed).
 */
async function clipId(text: string): Promise<string> {
	const digest = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(text));
	return [...new Uint8Array(digest)]
		.map((byte) => byte.toString(16).padStart(2, '0'))
		.join('')
		.slice(0, 10);
}

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

	it('derives every id as sha1(text)[:10]', async () => {
		for (const text of collectFragments()) {
			expect(voiceMap[text], text).toBe(await clipId(text));
		}
	});

	it('never leaks the child name', () => {
		expect(collectFragments().some((text) => text.includes('Sam'))).toBe(false);
	});
});

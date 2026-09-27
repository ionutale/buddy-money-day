import { describe, expect, it } from 'vitest';
import type { StorageLike } from './persistence';
import { DEFAULT_SETTINGS, loadSettings, saveSettings, SETTINGS_KEY } from './settings';

function mapStorage(): StorageLike & { raw: Map<string, string> } {
	const raw = new Map<string, string>();
	return {
		raw,
		getItem: (key) => raw.get(key) ?? null,
		setItem: (key, value) => void raw.set(key, value),
		removeItem: (key) => void raw.delete(key)
	};
}

/** Fresh installs and any unreadable save land here: silent, system voice. */
const SILENT = { voiceEnabled: false, voiceURI: null };

describe('grown-up settings', () => {
	it('defaults to silent with the system voice when nothing is stored', () => {
		expect(DEFAULT_SETTINGS).toEqual(SILENT);
		expect(loadSettings(mapStorage())).toEqual(SILENT);
	});

	it('a stored choice to turn voice on still wins over the silent default', () => {
		const storage = mapStorage();
		saveSettings({ voiceEnabled: true, voiceURI: null }, storage);
		expect(loadSettings(storage)).toEqual({ voiceEnabled: true, voiceURI: null });
		// The stored value is read back even when it disagrees with the default.
		storage.setItem(SETTINGS_KEY, JSON.stringify({ voiceEnabled: true, voiceURI: 'voice-bella' }));
		expect(loadSettings(storage)).toEqual({ voiceEnabled: true, voiceURI: 'voice-bella' });
	});

	it('roundtrips both the switch and the chosen voice actor', () => {
		const storage = mapStorage();
		saveSettings({ voiceEnabled: false, voiceURI: 'voice-rex' }, storage);
		expect(storage.raw.has(SETTINGS_KEY)).toBe(true);
		expect(loadSettings(storage)).toEqual({ voiceEnabled: false, voiceURI: 'voice-rex' });
	});

	it('loads saves from before the actor picker existed', () => {
		const storage = mapStorage();
		storage.setItem(SETTINGS_KEY, JSON.stringify({ voiceEnabled: true }));
		expect(loadSettings(storage)).toEqual({ voiceEnabled: true, voiceURI: null });
	});

	it('falls back to silence for corrupt json', () => {
		const storage = mapStorage();
		storage.setItem(SETTINGS_KEY, '{not json');
		expect(loadSettings(storage)).toEqual(SILENT);
	});

	it('falls back to silence for foreign shapes', () => {
		const storage = mapStorage();
		storage.setItem(SETTINGS_KEY, JSON.stringify({ voiceEnabled: 'yes' }));
		expect(loadSettings(storage)).toEqual(SILENT);
		storage.setItem(SETTINGS_KEY, JSON.stringify(['voiceEnabled']));
		expect(loadSettings(storage)).toEqual(SILENT);
		storage.setItem(SETTINGS_KEY, JSON.stringify(null));
		expect(loadSettings(storage)).toEqual(SILENT);
	});

	it('treats a non-string voice actor as the system default', () => {
		const storage = mapStorage();
		storage.setItem(SETTINGS_KEY, JSON.stringify({ voiceEnabled: true, voiceURI: 42 }));
		expect(loadSettings(storage)).toEqual({ voiceEnabled: true, voiceURI: null });
	});

	it('survives a storage that throws', () => {
		const broken: StorageLike = {
			getItem: () => {
				throw new Error('nope');
			},
			setItem: () => {
				throw new Error('nope');
			},
			removeItem: () => {
				throw new Error('nope');
			}
		};
		expect(loadSettings(broken)).toEqual(SILENT);
		expect(() => saveSettings({ voiceEnabled: false, voiceURI: null }, broken)).not.toThrow();
	});
});

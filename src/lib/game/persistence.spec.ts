import { describe, expect, it } from 'vitest';
import { clearSave, loadState, saveState, SAVE_KEY, type StorageLike } from './persistence';
import { beginDay, greetDone, newGame, submitName, tidyToy, waterDrop } from './state';
import type { GameState } from './types';

function mapStorage(): StorageLike & { raw: Map<string, string> } {
	const raw = new Map<string, string>();
	return {
		raw,
		getItem: (key) => raw.get(key) ?? null,
		setItem: (key, value) => void raw.set(key, value),
		removeItem: (key) => void raw.delete(key)
	};
}

describe('loading a save', () => {
	it('boots a fresh game when nothing is stored', () => {
		const s = loadState(mapStorage());
		expect(s.phase).toBe('setup');
		expect(s.day).toBe(1);
	});

	it('keeps durable progress but restarts the unfinished day', () => {
		const storage = mapStorage();
		// A realistic mid-day save: two toys tidied and a partly saved jar.
		let day: GameState = newGame();
		day = submitName(day, 'Andrei');
		day = beginDay(day);
		day = greetDone(day);
		day = tidyToy(day);
		day = tidyToy(day);
		day = waterDrop(day);
		day = { ...day, jarCoins: 4, day: 2, planks: 1, fedToday: true, coins: 3 };
		saveState(day, storage);

		const loaded = loadState(storage);
		expect(loaded.childName).toBe('Andrei');
		expect(loaded.jarCoins).toBe(4);
		expect(loaded.day).toBe(2);
		expect(loaded.planks).toBe(1);
		// the day itself restarts clean
		expect(loaded.phase).toBe('start');
		expect(loaded.coins).toBe(0);
		expect(loaded.tidyDone).toBe(0);
		expect(loaded.fedToday).toBe(false);
	});

	it('stays in grown-up setup until first run is finished', () => {
		const storage = mapStorage();
		saveState(newGame(), storage);
		expect(loadState(storage).phase).toBe('setup');
	});

	it('boots a fresh game from corrupt json', () => {
		const storage = mapStorage();
		storage.setItem(SAVE_KEY, '{definitely not json');
		expect(loadState(storage).phase).toBe('setup');
	});

	it('boots a fresh game from a save of an unknown version', () => {
		const storage = mapStorage();
		storage.setItem(SAVE_KEY, JSON.stringify({ ...newGame(), schemaVersion: 999 }));
		expect(loadState(storage).phase).toBe('setup');
	});

	it('boots a fresh game from a foreign object with the right version number', () => {
		const storage = mapStorage();
		storage.setItem(SAVE_KEY, JSON.stringify({ schemaVersion: 1, hello: 'world' }));
		expect(loadState(storage).phase).toBe('setup');
	});
});

describe('saving and clearing', () => {
	it('roundtrips a state through storage', () => {
		const storage = mapStorage();
		const s = { ...newGame(), childName: 'Andrei', jarCoins: 3, day: 3 };
		saveState(s, storage);
		const loaded = loadState(storage);
		expect(loaded.childName).toBe('Andrei');
		expect(loaded.jarCoins).toBe(3);
		expect(loaded.day).toBe(3);
	});

	it('clearSave removes the save', () => {
		const storage = mapStorage();
		saveState(newGame(), storage);
		expect(storage.raw.has(SAVE_KEY)).toBe(true);
		clearSave(storage);
		expect(storage.raw.has(SAVE_KEY)).toBe(false);
	});
});

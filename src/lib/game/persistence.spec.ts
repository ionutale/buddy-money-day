import { describe, expect, it } from 'vitest';
import type { ToyId } from './economy';
import { clearSave, loadState, saveState, SAVE_KEY, type StorageLike } from './persistence';
import { beginDay, greetDone, newGame, openTidy, submitName, tidyToy } from './state';
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

/**
 * A v1 save: the durable fields the migration keeps, plus the retired v1 keys
 * it must drop (the old goal and home items, planks, a mid-day phase).
 */
function v1Save(overrides: Record<string, unknown> = {}): string {
	return JSON.stringify({
		schemaVersion: 1,
		childName: 'Sam',
		nameSkipped: false,
		day: 3,
		goal: 'kite',
		jarCoins: 5,
		homeItems: ['kite'],
		planks: 2,
		phase: 'shelf',
		goalCompletedToday: false,
		savedToday: 2,
		coins: 3,
		tidyDone: 3,
		waterDone: 3,
		fedToday: true,
		gaveToday: 0,
		...overrides
	});
}

describe('loading a save', () => {
	it('boots a fresh game when nothing is stored', () => {
		const s = loadState(mapStorage());
		expect(s.phase).toBe('setup');
		expect(s.day).toBe(1);
		expect(s.goal).toBe('wagon');
		expect(s.owned).toEqual([]);
	});

	it('keeps durable progress but restarts the unfinished day', () => {
		const storage = mapStorage();
		// A realistic mid-day v2 save: two toys tidied, a bought ball, a partly saved jar.
		let day: GameState = submitName(newGame(), 'Sam');
		day = beginDay(day);
		day = greetDone(day);
		day = openTidy(day);
		day = tidyToy(day);
		day = tidyToy(day);
		day = {
			...day,
			jarCoins: 4,
			day: 2,
			owned: ['ball'] as ToyId[],
			coins: 3,
			earnedTodayCoins: 2
		};
		saveState(day, storage);

		const loaded = loadState(storage);
		expect(loaded.childName).toBe('Sam');
		expect(loaded.jarCoins).toBe(4);
		expect(loaded.day).toBe(2);
		expect(loaded.owned).toEqual(['ball']);
		expect(loaded.goal).toBe('wagon');
		// the day itself restarts clean
		expect(loaded.phase).toBe('start');
		expect(loaded.coins).toBe(0);
		expect(loaded.tidyDone).toBe(0);
		expect(loaded.fedToday).toBe(false);
		expect(loaded.earnedTodayCoins).toBe(0);
		expect(loaded.savedToday).toBe(0);
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
		storage.setItem(SAVE_KEY, JSON.stringify({ schemaVersion: 2, hello: 'world' }));
		expect(loadState(storage).phase).toBe('setup');
	});

	it('boots a fresh game when the goal is not a dream', () => {
		const storage = mapStorage();
		storage.setItem(SAVE_KEY, JSON.stringify({ ...newGame(), goal: 'ball' }));
		expect(loadState(storage).phase).toBe('setup');
	});

	it('boots a fresh game when an owned toy is unknown', () => {
		const storage = mapStorage();
		storage.setItem(SAVE_KEY, JSON.stringify({ ...newGame(), owned: ['dragon'] }));
		expect(loadState(storage).phase).toBe('setup');
	});
});

describe('migrating the v1 save', () => {
	it('keeps the child, the day, and the jar; the dream becomes the wagon', () => {
		const storage = mapStorage();
		storage.setItem(SAVE_KEY, v1Save());
		const loaded = loadState(storage);

		expect(loaded.schemaVersion).toBe(2);
		expect(loaded.childName).toBe('Sam');
		expect(loaded.day).toBe(3);
		expect(loaded.jarCoins).toBe(5);
		expect(loaded.goal).toBe('wagon');
		expect(loaded.owned).toEqual([]);
		// the old mid-day state is dropped, and the day restarts at the title
		expect(loaded.phase).toBe('start');
		expect(loaded.coins).toBe(0);
		expect(loaded.tidyDone).toBe(0);
		expect(loaded.waterDone).toBe(0);
		expect(loaded.fedToday).toBe(false);
		expect(loaded.earnedTodayCoins).toBe(0);
		expect(loaded.savedToday).toBe(0);
		expect(loaded.dreamCompletedToday).toBe(false);
	});

	it('keeps a skipped name from v1', () => {
		const storage = mapStorage();
		storage.setItem(SAVE_KEY, v1Save({ childName: '', nameSkipped: true }));
		const loaded = loadState(storage);
		expect(loaded.childName).toBe('');
		expect(loaded.nameSkipped).toBe(true);
	});

	it('a v1 save still in grown-up setup stays in setup', () => {
		const storage = mapStorage();
		storage.setItem(SAVE_KEY, v1Save({ phase: 'setup', day: 1, jarCoins: 0 }));
		expect(loadState(storage).phase).toBe('setup');
	});

	it('a v1-shaped object missing the game fields boots fresh instead of crashing', () => {
		const storage = mapStorage();
		storage.setItem(SAVE_KEY, JSON.stringify({ schemaVersion: 1, hello: 'world' }));
		expect(loadState(storage).phase).toBe('setup');
	});
});

describe('saving and clearing', () => {
	it('roundtrips durable progress through storage', () => {
		const storage = mapStorage();
		const s = {
			...newGame(),
			childName: 'Sam',
			jarCoins: 3,
			day: 3,
			owned: ['ball', 'car'] as ToyId[]
		};
		saveState(s, storage);
		const loaded = loadState(storage);
		expect(loaded.schemaVersion).toBe(2);
		expect(loaded.childName).toBe('Sam');
		expect(loaded.jarCoins).toBe(3);
		expect(loaded.day).toBe(3);
		expect(loaded.owned).toEqual(['ball', 'car']);
		expect(loaded.goal).toBe('wagon');
	});

	it('clearSave removes the save', () => {
		const storage = mapStorage();
		saveState(newGame(), storage);
		expect(storage.raw.has(SAVE_KEY)).toBe(true);
		clearSave(storage);
		expect(storage.raw.has(SAVE_KEY)).toBe(false);
	});
});

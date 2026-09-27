import { DREAMS, TOYS, type ToyId } from './economy';
import { newGame, resetDayTransients } from './state';
import { SCHEMA_VERSION, type GameState } from './types';

/**
 * Per-device saves in localStorage. Nothing ever leaves the phone
 * (docs/adr/0004). A corrupt, foreign, or unknown save boots a fresh
 * game instead of crashing; coins in hand never survive a reload,
 * the jar does. v1 saves migrate: name, day, and jar survive, the old
 * goals retire, and the dream becomes the wagon.
 */

export const SAVE_KEY = 'money-day-save';

export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** Memory-backed fallback, so SSR/tests never touch real storage. */
const memory = new Map<string, string>();
const memoryStorage: StorageLike = {
	getItem: (key) => memory.get(key) ?? null,
	setItem: (key, value) => void memory.set(key, value),
	removeItem: (key) => void memory.delete(key)
};

export function defaultStorage(): StorageLike {
	try {
		if (typeof localStorage !== 'undefined') return localStorage;
	} catch {
		/* some privacy modes throw on access */
	}
	return memoryStorage;
}

function isToyId(value: unknown): value is ToyId {
	return typeof value === 'string' && (TOYS as readonly string[]).includes(value);
}

function isDreamId(value: unknown): value is ToyId {
	return typeof value === 'string' && (DREAMS as readonly string[]).includes(value);
}

function looksLikeGameState(value: unknown): value is GameState {
	if (typeof value !== 'object' || value === null) return false;
	const g = value as Record<string, unknown>;
	return (
		g.schemaVersion === SCHEMA_VERSION &&
		typeof g.childName === 'string' &&
		typeof g.nameSkipped === 'boolean' &&
		typeof g.day === 'number' &&
		isDreamId(g.goal) &&
		typeof g.jarCoins === 'number' &&
		Array.isArray(g.owned) &&
		g.owned.every(isToyId)
	);
}

function looksLikeV1GameState(value: unknown): boolean {
	if (typeof value !== 'object' || value === null) return false;
	const g = value as Record<string, unknown>;
	return (
		g.schemaVersion === 1 &&
		typeof g.childName === 'string' &&
		typeof g.nameSkipped === 'boolean' &&
		typeof g.day === 'number' &&
		typeof g.jarCoins === 'number'
	);
}

/** Carries the family's progress across the schema break; everything else is fresh. */
function migrateV1(v1: Record<string, unknown>): GameState {
	return {
		...newGame(),
		childName: v1.childName as string,
		nameSkipped: v1.nameSkipped as boolean,
		day: Math.max(1, Math.floor(v1.day as number)),
		jarCoins: Math.max(0, Math.floor(v1.jarCoins as number)),
		phase: v1.phase === 'setup' ? 'setup' : 'start'
	};
}

/** Durable progress survives a reload; the day itself restarts at the title. */
function withFreshDay(s: GameState): GameState {
	if (s.phase === 'setup') return s; // first run has not really begun yet
	return { ...resetDayTransients(s), phase: 'start' };
}

export function loadState(storage: StorageLike = defaultStorage()): GameState {
	try {
		const raw = storage.getItem(SAVE_KEY);
		if (raw === null) return newGame();
		const parsed: unknown = JSON.parse(raw);
		if (looksLikeGameState(parsed)) return withFreshDay(parsed);
		if (looksLikeV1GameState(parsed)) {
			return withFreshDay(migrateV1(parsed as Record<string, unknown>));
		}
		return newGame();
	} catch {
		return newGame();
	}
}

export function saveState(s: GameState, storage: StorageLike = defaultStorage()): void {
	try {
		storage.setItem(SAVE_KEY, JSON.stringify(s));
	} catch {
		/* storage full or unavailable — the game keeps playing without persistence */
	}
}

export function clearSave(storage: StorageLike = defaultStorage()): void {
	try {
		storage.removeItem(SAVE_KEY);
	} catch {
		/* nothing to do */
	}
}

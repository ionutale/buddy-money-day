import { TIDY_TOYS } from './economy';

/**
 * The tidy chore's toy pool: six kinds, three of them scattered each day.
 * Bigger than one day's mess on purpose — the floor looks different tomorrow.
 * Drum, boat, and robot live only here: they are toys to tidy, not store wares.
 */
export const TIDY_POOL = ['ball', 'blocks', 'teddy', 'drum', 'boat', 'robot'] as const;

/** A kind of toy the tidy chore can scatter. */
export type TidyKind = (typeof TIDY_POOL)[number];

/** mulberry32 — a tiny deterministic PRNG. One seed, the same shuffle forever. */
function mulberry32(seed: number): () => number {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) | 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/** Day 1 is a real day, not seed 0, so fold the day into the mixer first. */
function seedOf(day: number): number {
	const whole = Number.isFinite(day) ? Math.trunc(day) : 0;
	return Math.imul(whole + 1, 0x9e3779b1);
}

/**
 * The three distinct toys the tidy chore scatters on the given day.
 * Pure and seeded by the day number alone: a reload mid-day rerolls nothing,
 * while tomorrow brings a different corner of the pool.
 */
export function pickTidyToys(day: number): TidyKind[] {
	const rand = mulberry32(seedOf(day));
	const shuffled = [...TIDY_POOL];
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(rand() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}
	return shuffled.slice(0, TIDY_TOYS);
}

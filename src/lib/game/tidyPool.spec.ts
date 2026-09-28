import { describe, expect, it } from 'vitest';
import { TIDY_TOYS } from './economy';
import { pickTidyToys, TIDY_POOL } from './tidyPool';

const SIX_KINDS = ['ball', 'blocks', 'teddy', 'drum', 'boat', 'robot'];

/** Days 1..40 — a month and a half of mornings, enough to expose any pattern. */
const DAYS = Array.from({ length: 40 }, (_, i) => i + 1);

describe('the tidy pool', () => {
	it('holds six kinds: the old three plus drum, boat, and robot', () => {
		expect(TIDY_POOL).toEqual(SIX_KINDS);
	});

	it('scatters exactly the day’s three toys, every kind from the pool', () => {
		for (const day of DAYS) {
			const trio = pickTidyToys(day);
			expect(trio).toHaveLength(TIDY_TOYS);
			for (const kind of trio) {
				expect(TIDY_POOL).toContain(kind);
			}
		}
	});

	it('never repeats a kind in one day', () => {
		for (const day of DAYS) {
			const trio = pickTidyToys(day);
			expect(new Set(trio).size).toBe(TIDY_TOYS);
		}
	});

	it('is the same trio every time the day is asked for — a reload is not a reroll', () => {
		for (const day of DAYS) {
			expect(pickTidyToys(day)).toEqual(pickTidyToys(day));
		}
	});

	it('pins day 1: an algorithm or seed change is a deliberate, reviewed edit', () => {
		expect(pickTidyToys(1)).toEqual(['ball', 'boat', 'blocks']);
	});

	it('picks without disturbing the pool', () => {
		const before = [...TIDY_POOL];
		for (const day of DAYS) pickTidyToys(day);
		expect(TIDY_POOL).toEqual(before);
	});

	it('varies across days: every week offers at least two different trios', () => {
		// Seven-day windows starting on each of the 40 days.
		for (let start = 1; start <= 40; start++) {
			const week = Array.from({ length: 7 }, (_, offset) =>
				pickTidyToys(start + offset).join(',')
			);
			expect(new Set(week).size).toBeGreaterThan(1);
		}
	});

	it('rotates the whole pool: all six kinds appear within a month', () => {
		const seen = new Set(DAYS.flatMap((day) => pickTidyToys(day)));
		expect(seen).toEqual(new Set(SIX_KINDS));
	});
});

import { describe, expect, it } from 'vitest';
import { lines } from './lines';
import { newGame } from './state';
import { spoken, TOGGLE_ON } from './spoken';
import type { GameState } from './types';

function s(patch: Partial<GameState> = {}): GameState {
	return { ...newGame(), ...patch };
}

describe('the spoken catalogue', () => {
	it('covers every line in lines.ts with a non-empty fragment list', () => {
		for (const key of Object.keys(lines) as (keyof typeof lines)[]) {
			expect(spoken[key], key).toBeTypeOf('function');
			const fragments = spoken[key](s());
			expect(Array.isArray(fragments), key).toBe(true);
			expect(fragments.length, key).toBeGreaterThan(0);
			for (const fragment of fragments) expect(fragment.length).toBeGreaterThan(0);
		}
	});

	it('never speaks the child name', () => {
		const named = s({ childName: 'Sam' });
		const texts = [
			...spoken.setup(named),
			...spoken.start(named),
			...spoken.greetingPlan(named),
			...spoken.dreamReached(named),
			...spoken.recapLine(named)
		];
		for (const text of texts) expect(text).not.toContain('Sam');
	});

	it('keeps the on-screen meaning while dropping the name', () => {
		expect(spoken.start(s({ childName: 'Sam' }))).toEqual([
			'Hi! Buddy is ready for a Money Day.'
		]);
		expect(spoken.greetingPlan(s())).toEqual([
			'Good morning!',
			'Today we can earn 4 coins for your wagon!'
		]);
	});

	it('splits the combinatorial lines into dedupable fragments', () => {
		expect(spoken.dreamStands(s({ jarCoins: 7 }))).toEqual(['Your wagon has 7 of 12.']);
		expect(spoken.recapLine(s({ earnedTodayCoins: 4, jarCoins: 4 }))).toEqual([
			'Today you earned 4 coins.',
			'Your wagon has 4 of 12.',
			'8 more chores tomorrow!'
		]);
		expect(spoken.storeCompare('ball', s({ coins: 0 }))).toEqual([
			"That's 2 coins — you have 0.",
			'Two more chores tomorrow!'
		]);
	});

	it('celebrates a completed dream in the recap', () => {
		expect(
			spoken.recapLine(s({ goal: 'teddy', dreamCompletedToday: true, owned: ['wagon'] }))
		).toEqual([
			'You did it!',
			'The wagon is yours.',
			'Your big teddy needs 12 coins — we can start tomorrow!'
		]);
	});

	it('exposes the toggle line', () => {
		expect(TOGGLE_ON).toBe('Voice on!');
	});
});

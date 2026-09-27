import { describe, expect, it } from 'vitest';
import { GOAL_COST } from './economy';
import { lines } from './lines';
import { newGame } from './state';
import type { GameState } from './types';

/** A state with only the fields a line cares about overridden. */
function s(patch: Partial<GameState>): GameState {
	return { ...newGame(), ...patch };
}

describe('whereGoalStands', () => {
	it('names the goal and the distance', () => {
		expect(lines.whereGoalStands(s({ jarCoins: 4 }))).toBe('Your kite has 4 of 6.');
		expect(lines.whereGoalStands(s({ jarCoins: 0 }))).toBe('Your kite has 0 of 6.');
	});

	it('celebrates a completed goal', () => {
		expect(lines.whereGoalStands(s({ jarCoins: GOAL_COST }))).toBe('Your kite is yours!');
	});

	it('uses the current goal label', () => {
		expect(lines.whereGoalStands(s({ goal: 'hat', jarCoins: 2 }))).toBe(
			'Your funny hat has 2 of 6.'
		);
	});
});

describe('goalStillStands', () => {
	it('restates where a spend left the goal, without reproach', () => {
		expect(lines.goalStillStands(s({ jarCoins: 4 }))).toBe('Your kite still has 4 of 6.');
	});
});

describe('the morning plan', () => {
	it('promises the whole day in one line', () => {
		expect(lines.planLine(s({}))).toBe('Today we can earn 3 coins for your kite!');
	});

	it('greets with the plan in one spoken breath', () => {
		expect(lines.greetingPlan(s({ childName: 'Sam' }))).toBe(
			'Good morning, Sam! Today we can earn 3 coins for your kite!'
		);
		expect(lines.greetingPlan(s({}))).toContain('Good morning, friend!');
	});
});

describe('the tasks state their deal', () => {
	it('tidy names the reason and the price', () => {
		expect(lines.tidy(s({}))).toBe("Look at this mess! Tidy the toys — I'll pay you two coins!");
		expect(lines.tidyPaid(s({}))).toBe('Two coins earned!');
	});

	it('water names the reason and the price', () => {
		expect(lines.water(s({}))).toBe('The little tree is thirsty! Water it — one coin!');
		expect(lines.waterPaid(s({}))).toBe('One coin earned!');
	});
});

describe('spends restate the goal', () => {
	it('feeding', () => {
		expect(lines.hungerSpent(s({ jarCoins: 1 }))).toBe(
			'One coin for food. Your kite still has 1 of 6.'
		);
	});

	it('giving a plank', () => {
		expect(lines.friendGiveGoal(s({ jarCoins: 2 }))).toContain('still has 2 of 6.');
	});

	it('the lollipop', () => {
		expect(lines.lollipopGoal(s({ jarCoins: 1 }))).toContain('still has 1 of 6.');
	});
});

describe('the shelf completion line', () => {
	it('announces exactly six of six', () => {
		expect(lines.shelfComplete(s({}))).toBe("That's 6 of 6 — your kite!");
	});
});

describe('the tuck-in recap', () => {
	it('tells the whole story when a goal was completed today', () => {
		const completed = s({
			goalCompletedToday: true,
			goal: 'hat',
			homeItems: ['kite'],
			jarCoins: 2
		});
		expect(lines.recapLine(completed)).toBe(
			'You did it! The kite is yours. Your funny hat needs 6 coins — we can start tomorrow!'
		);
	});

	it('counts the earnings and the distance while still saving', () => {
		const saving = s({ coins: 1, fedToday: true, gaveToday: 1, jarCoins: 3 });
		expect(lines.recapLine(saving)).toBe(
			"Today you earned 3 coins. Your kite has 3 of 6 — 3 more and it's yours!"
		);

		expect(lines.recapLine(s({ coins: 3, jarCoins: 5 }))).toBe(
			"Today you earned 3 coins. Your kite has 5 of 6 — One more and it's yours!"
		);
	});

	it('speaks in singular for a single coin', () => {
		expect(lines.recapLine(s({ coins: 1, jarCoins: 3 }))).toContain('Today you earned 1 coin.');
	});

	it('maps tomorrow when nothing reached the jar', () => {
		expect(lines.recapLine(s({ coins: 1, fedToday: true, gaveToday: 1 }))).toBe(
			'Today you earned 3 coins. Your kite has 0 of 6. Tomorrow we can earn more!'
		);
	});
});

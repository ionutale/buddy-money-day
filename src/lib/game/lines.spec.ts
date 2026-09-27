import { describe, expect, it } from 'vitest';
import { TOY_PRICES } from './economy';
import { lines, storeCompare } from './lines';
import { newGame } from './state';
import type { GameState } from './types';

/** A state with only the fields a line cares about overridden. */
function s(patch: Partial<GameState>): GameState {
	return { ...newGame(), ...patch };
}

describe('where the dream stands', () => {
	it('names the dream and the distance to its price', () => {
		expect(lines.dreamStands(s({ jarCoins: 7 }))).toBe('Your wagon has 7 of 12.');
		expect(lines.dreamStands(s({ jarCoins: 0 }))).toBe('Your wagon has 0 of 12.');
	});

	it('celebrates a completed dream', () => {
		expect(lines.dreamStands(s({ jarCoins: TOY_PRICES.wagon }))).toBe('Your wagon is yours!');
	});

	it('uses the current dream label', () => {
		expect(lines.dreamStands(s({ goal: 'teddy', jarCoins: 3 }))).toBe(
			'Your big teddy has 3 of 12.'
		);
	});
});

describe('the morning plan', () => {
	it('promises the whole day in one line', () => {
		expect(lines.planLine(s({}))).toBe('Today we can earn 4 coins for your wagon!');
	});

	it('greets with the plan in one spoken breath', () => {
		expect(lines.greetingPlan(s({ childName: 'Sam' }))).toBe(
			'Good morning, Sam! Today we can earn 4 coins for your wagon!'
		);
		expect(lines.greetingPlan(s({}))).toContain('Good morning, friend!');
	});

	it('greets without a trace of sadness', () => {
		expect(lines.greeting(s({ childName: 'Sam' }))).toBe(
			'Good morning, Sam! Buddy is so happy to see you!'
		);
	});
});

describe('the chores state their deal', () => {
	it('tidy names the reason and the price', () => {
		expect(lines.tidy(s({}))).toBe("Look at this mess! Tidy the toys — I'll pay you two coins!");
		expect(lines.tidyPaid(s({}))).toBe('Two coins earned!');
	});

	it('water names the reason and the price', () => {
		expect(lines.water(s({}))).toBe('The little tree is thirsty! Water it — one coin!');
		expect(lines.waterPaid(s({}))).toBe('One coin earned!');
	});

	it('feeding is a job that pays, never a need that costs', () => {
		expect(lines.feed(s({}))).toBe("I'm hungry! Feed me and I'll pay you a coin!");
		expect(lines.feedPaid(s({}))).toBe('One coin earned!');
	});

	it('names the all-done cap', () => {
		expect(lines.cap(s({}))).toBe('All chores done! More tomorrow.');
	});
});

describe('the store', () => {
	it('offers a toy or the dream', () => {
		expect(lines.store(s({}))).toBe('Time to choose! A toy now, or save for your wagon?');
		expect(lines.storeSave(s({}))).toBe('Save the rest for your wagon.');
		expect(lines.storeSave(s({ goal: 'teddy' }))).toBe('Save the rest for your big teddy.');
	});

	it('praises a bought toy and a toy already at home', () => {
		expect(lines.storeBought(s({}))).toBe("It's in your room!");
		expect(lines.storeOwned(s({}))).toBe('In your room!');
	});

	it('compares honestly when a toy is out of reach', () => {
		// The spec's exact example: 6-coin blocks, 4 coins in hand.
		expect(storeCompare('blocks', s({ coins: 4 }))).toBe(
			"That's 6 coins — you have 4. Two more chores tomorrow!"
		);
		expect(storeCompare('ball', s({ coins: 1 }))).toBe(
			"That's 2 coins — you have 1. One more chore tomorrow!"
		);
		expect(storeCompare('ball', s({ coins: 0 }))).toBe(
			"That's 2 coins — you have 0. Two more chores tomorrow!"
		);
	});

	it('restates the dream where a shop line leaves it', () => {
		expect(lines.dreamStands(s({ jarCoins: 2 }))).toBe('Your wagon has 2 of 12.');
	});
});

describe('the dream celebration', () => {
	it('names the child and the dream', () => {
		expect(lines.dreamReached(s({ childName: 'Sam' }))).toBe(
			'You did it, Sam! You saved 12 coins for your very own wagon!'
		);
		expect(lines.dreamReached(s({}))).toBe(
			'You did it, friend! You saved 12 coins for your very own wagon!'
		);
	});

	it('speaks about the new dream after a cycle', () => {
		expect(lines.dreamReached(s({ goal: 'teddy' }))).toContain('very own big teddy!');
	});
});

describe('the toys room', () => {
	it('hints gently when the rug is empty', () => {
		expect(lines.toysEmpty(s({}))).toBe('No toys yet! Do chores, then visit the store.');
	});
});

describe('the tuck-in recap', () => {
	it('tells the whole story when a dream was completed today', () => {
		const completed = s({
			dreamCompletedToday: true,
			goal: 'teddy',
			owned: ['wagon'],
			jarCoins: 1
		});
		expect(lines.recapLine(completed)).toBe(
			'You did it! The wagon is yours. Your big teddy needs 12 coins — we can start tomorrow!'
		);
	});

	it('counts the earnings and the chores still ahead', () => {
		const saving = s({ earnedTodayCoins: 4, jarCoins: 7 });
		expect(lines.recapLine(saving)).toBe(
			'Today you earned 4 coins. Your wagon has 7 of 12 — 5 more chores tomorrow!'
		);

		expect(lines.recapLine(s({ earnedTodayCoins: 4, jarCoins: 11 }))).toBe(
			'Today you earned 4 coins. Your wagon has 11 of 12 — One more chore tomorrow!'
		);

		expect(lines.recapLine(s({ earnedTodayCoins: 4, jarCoins: 10 }))).toBe(
			'Today you earned 4 coins. Your wagon has 10 of 12 — Two more chores tomorrow!'
		);
	});

	it('speaks in singular for a single coin', () => {
		expect(lines.recapLine(s({ earnedTodayCoins: 1, jarCoins: 7 }))).toContain(
			'Today you earned 1 coin.'
		);
	});

	it('maps tomorrow when nothing reached the jar yet', () => {
		expect(lines.recapLine(s({ earnedTodayCoins: 4, jarCoins: 0 }))).toBe(
			'Today you earned 4 coins. Your wagon has 0 of 12. Tomorrow we can earn more!'
		);
	});

	it('says good night without a trace of hunger', () => {
		expect(lines.tuckIn(s({ childName: 'Sam' }))).toBe('Good night, Buddy. Good night, Sam!');
	});
});

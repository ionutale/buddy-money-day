import { describe, expect, it } from 'vitest';
import { GOALS, LOLLIPOP_COST, SWING_PLANKS, TIDY_REWARD, WATER_REWARD } from './economy';
import {
	beginDay,
	buyLollipop,
	continueAfterLollipop,
	feedBuddy,
	friendDone,
	giveCoin,
	goalCelebrated,
	greetDone,
	jarsDone,
	newGame,
	nextGoalOptions,
	pickGoal,
	saveAll,
	skipFeed,
	skipName,
	submitName,
	tidyToy,
	tuckInDone,
	waterDrop
} from './state';
import type { GameState } from './types';

/** A day at the 'greeting' phase, name already set. */
function freshDay(): GameState {
	let s = newGame();
	s = submitName(s, 'Andrei');
	return beginDay(s);
}

/** Complete both Helping Tasks; ends at the 'hunger' phase with coins in hand. */
function withTasks(s: GameState): GameState {
	s = greetDone(s);
	for (let i = 0; i < 3; i++) s = tidyToy(s);
	for (let i = 0; i < 3; i++) s = waterDrop(s);
	return s;
}

/** Abandon the day with no feeding, no giving, and the default save. */
function skipEverythingAndSave(s: GameState): GameState {
	s = skipFeed(s);
	s = friendDone(s);
	s = saveAll(s);
	return s;
}

function withPatch(s: GameState, patch: Partial<GameState>): GameState {
	return { ...s, ...patch };
}

describe('new game', () => {
	it('starts at grown-up setup with an empty jar and the first goal', () => {
		const s = newGame();
		expect(s.phase).toBe('setup');
		expect(s.day).toBe(1);
		expect(s.coins).toBe(0);
		expect(s.jarCoins).toBe(0);
		expect(s.goal).toBe('kite');
		expect(s.homeItems).toEqual([]);
		expect(s.planks).toBe(0);
		expect(s.buddySad).toBe(false);
	});
});

describe('grown-up setup', () => {
	it('accepts a name and moves to the start screen', () => {
		const s = submitName(newGame(), '  Andrei  ');
		expect(s.childName).toBe('Andrei');
		expect(s.phase).toBe('start');
	});

	it('can be skipped without a name', () => {
		const s = skipName(newGame());
		expect(s.childName).toBe('');
		expect(s.nameSkipped).toBe(true);
		expect(s.phase).toBe('start');
	});
});

describe('beginning a money day', () => {
	it('resets loose coins and task progress, then greets', () => {
		const dirty = withPatch(newGame(), {
			phase: 'start',
			coins: 5,
			tidyDone: 2,
			waterDone: 1,
			fedToday: true,
			gaveToday: 2,
			lollipopToday: true
		});
		const s = beginDay(dirty);
		expect(s.phase).toBe('greeting');
		expect(s.coins).toBe(0);
		expect(s.tidyDone).toBe(0);
		expect(s.waterDone).toBe(0);
		expect(s.fedToday).toBe(false);
		expect(s.gaveToday).toBe(0);
		expect(s.lollipopToday).toBe(false);
	});
});

describe('helping tasks', () => {
	it('pays the tidy reward only when the last toy is tidied', () => {
		let s = greetDone(freshDay());
		s = tidyToy(s);
		s = tidyToy(s);
		expect(s.coins).toBe(0);
		expect(s.tidyDone).toBe(2);
		expect(s.phase).toBe('task-tidy');

		s = tidyToy(s);
		expect(s.coins).toBe(TIDY_REWARD);
		expect(s.phase).toBe('task-water');
	});

	it('pays the water reward only when the last drop lands, and then Buddy is hungry', () => {
		let s = greetDone(freshDay());
		for (let i = 0; i < 3; i++) s = tidyToy(s);
		s = waterDrop(s);
		s = waterDrop(s);
		expect(s.coins).toBe(TIDY_REWARD);
		expect(s.waterDone).toBe(2);

		s = waterDrop(s);
		expect(s.coins).toBe(TIDY_REWARD + WATER_REWARD);
		expect(s.phase).toBe('hunger');
	});

	it('clamps repeated taps so extra actions cannot mint coins', () => {
		let s = greetDone(freshDay());
		for (let i = 0; i < 10; i++) s = tidyToy(s);
		for (let i = 0; i < 10; i++) s = waterDrop(s);
		expect(s.tidyDone).toBe(3);
		expect(s.waterDone).toBe(3);
		expect(s.coins).toBe(TIDY_REWARD + WATER_REWARD);
	});
});

describe('hunger', () => {
	it('feeding costs one coin and cheers Buddy up', () => {
		let s = withTasks(freshDay());
		s = withPatch(s, { buddySad: true });
		s = feedBuddy(s);
		expect(s.coins).toBe(TIDY_REWARD + WATER_REWARD - 1);
		expect(s.fedToday).toBe(true);
		expect(s.buddySad).toBe(false);
		expect(s.phase).toBe('friend');
	});

	it('cannot feed with no coins — the day stays at the bowl (tap-spam guard)', () => {
		const s = withPatch(withTasks(freshDay()), { coins: 0 });
		const after = feedBuddy(s);
		expect(after).toEqual(s);
	});

	it('skipping leaves the state untouched and moves on', () => {
		const before = withTasks(freshDay());
		const s = skipFeed(before);
		expect(s.phase).toBe('friend');
		expect(s.coins).toBe(before.coins);
		expect(s.fedToday).toBe(false);
	});
});

describe('the friend with the broken swing', () => {
	it('each coin given builds one plank', () => {
		let s = withTasks(freshDay());
		s = feedBuddy(s);
		s = giveCoin(s);
		expect(s.coins).toBe(1);
		expect(s.planks).toBe(1);
	});

	it('cannot give more than three planks, and never more coins than are held (tap-spam guard)', () => {
		let s = withPatch(withTasks(freshDay()), { phase: 'friend', planks: 0 });
		for (let i = 0; i < 10; i++) s = giveCoin(s);
		expect(s.planks).toBe(SWING_PLANKS);
		expect(s.coins).toBe(TIDY_REWARD + WATER_REWARD - SWING_PLANKS);

		const broke = withPatch(s, { coins: 0 });
		expect(giveCoin(broke)).toEqual(broke);
	});

	it('moving on reaches the shelf whatever was given', () => {
		const s = friendDone(skipFeed(withTasks(freshDay())));
		expect(s.phase).toBe('shelf');
	});
});

describe('the shelf: saving by default, spending deliberately', () => {
	it('saving moves every held coin into the jar', () => {
		const s = saveAll(withPatch(withTasks(freshDay()), { phase: 'shelf' }));
		expect(s.jarCoins).toBe(TIDY_REWARD + WATER_REWARD);
		expect(s.coins).toBe(0);
		expect(s.phase).toBe('jars');
	});

	it('the lollipop costs two coins and is praised, not repeated (tap-spam guard)', () => {
		let s = withPatch(withTasks(freshDay()), { phase: 'shelf' });
		s = buyLollipop(s);
		expect(s.coins).toBe(TIDY_REWARD + WATER_REWARD - LOLLIPOP_COST);
		expect(s.lollipopToday).toBe(true);
		expect(s.lollipopsTotal).toBe(1);
		expect(s.phase).toBe('shelf');

		const again = buyLollipop(s);
		expect(again).toEqual(s);
	});

	it('the lollipop cannot be bought without two coins', () => {
		const broke = withPatch(withTasks(freshDay()), { phase: 'shelf', coins: 1 });
		expect(buyLollipop(broke)).toEqual(broke);
	});

	it('after a lollipop the leftover still reaches the jar', () => {
		let s = withPatch(withTasks(freshDay()), { phase: 'shelf' });
		s = buyLollipop(s);
		s = continueAfterLollipop(s);
		expect(s.jarCoins).toBe(TIDY_REWARD + WATER_REWARD - LOLLIPOP_COST);
		expect(s.coins).toBe(0);
		expect(s.phase).toBe('jars');
	});

	it('continuing after a lollipop is only possible once a lollipop exists', () => {
		const s = withPatch(withTasks(freshDay()), { phase: 'shelf' });
		expect(continueAfterLollipop(s)).toEqual(s);
	});
});

describe('the jars ritual', () => {
	it('below the goal price the day simply ends', () => {
		const s = jarsDone(saveAll(withPatch(withTasks(freshDay()), { phase: 'shelf' })));
		expect(s.phase).toBe('tuck-in');
	});

	it('at the goal price the celebration begins', () => {
		const s = jarsDone(
			saveAll(withPatch(withTasks(freshDay()), { phase: 'shelf', jarCoins: 4 }))
		);
		expect(s.phase).toBe('goal-reached');
	});
});

describe('the goal cycle', () => {
	it('celebrating leads to picking the next goal', () => {
		const s = goalCelebrated(withPatch(newGame(), { phase: 'goal-reached' }));
		expect(s.phase).toBe('goal-pick');
	});

	it('picking the next goal shelves the finished one and keeps overflowing coins', () => {
		const s = withPatch(newGame(), { phase: 'goal-pick', jarCoins: 8, homeItems: [] });
		const picked = pickGoal(s, 'hat');
		expect(picked.homeItems).toEqual(['kite']);
		expect(picked.jarCoins).toBe(2);
		expect(picked.goal).toBe('hat');
		expect(picked.phase).toBe('tuck-in');
	});

	it('offers three goals, preferring the ones never collected', () => {
		expect(nextGoalOptions(newGame())).toEqual([...GOALS]);

		const collectedKite = withPatch(newGame(), { homeItems: ['kite'] });
		expect(nextGoalOptions(collectedKite)).toEqual(['hat', 'slide', 'kite']);

		const collectedAll = withPatch(newGame(), { homeItems: [...GOALS] });
		expect(nextGoalOptions(collectedAll)).toEqual([...GOALS]);
	});
});

describe('tuck-in and the next morning', () => {
	it('an unfed day leaves Buddy droopy, and the new day starts clean', () => {
		let s = withPatch(withTasks(freshDay()), { phase: 'tuck-in', fedToday: false });
		s = tuckInDone(s);
		expect(s.buddySad).toBe(true);
		expect(s.day).toBe(2);
		expect(s.phase).toBe('start');
		expect(s.coins).toBe(0);
	});

	it('a fed day leaves Buddy happy even if yesterday was sad', () => {
		let s = withPatch(withTasks(freshDay()), {
			phase: 'tuck-in',
			fedToday: true,
			buddySad: true
		});
		s = tuckInDone(s);
		expect(s.buddySad).toBe(false);
	});
});

describe('whole days, end to end', () => {
	it('two days of nothing but saving reach the goal (skip-everything path)', () => {
		let s = newGame();
		s = submitName(s, 'Andrei');
		s = beginDay(s);

		// day 1
		s = withTasks(s);
		s = skipEverythingAndSave(s);
		s = jarsDone(s);
		expect(s.phase).toBe('tuck-in');
		expect(s.jarCoins).toBe(3);
		s = tuckInDone(s);

		// day 2
		s = beginDay(s);
		s = withTasks(s);
		s = skipEverythingAndSave(s);
		s = jarsDone(s);
		expect(s.phase).toBe('goal-reached');
		expect(s.jarCoins).toBe(6);
		expect(s.buddySad).toBe(true);
	});

	it('overflow past the goal price is carried into the next goal', () => {
		let s = newGame();
		s = submitName(s, 'Andrei');
		s = beginDay(s);

		// day 1: feed Buddy, save the remaining two
		s = withTasks(s);
		s = feedBuddy(s);
		s = friendDone(s);
		s = saveAll(s);
		s = jarsDone(s);
		s = tuckInDone(s);
		expect(s.jarCoins).toBe(2);

		// day 2: skip the bowl, save three
		s = beginDay(s);
		s = withTasks(s);
		s = skipEverythingAndSave(s);
		s = jarsDone(s);
		s = tuckInDone(s);
		expect(s.jarCoins).toBe(5);

		// day 3: save three more — that is eight, two over the goal price
		s = beginDay(s);
		s = withTasks(s);
		s = skipEverythingAndSave(s);
		s = jarsDone(s);
		expect(s.phase).toBe('goal-reached');
		expect(s.jarCoins).toBe(8);

		s = goalCelebrated(s);
		s = pickGoal(s, 'hat');
		expect(s.jarCoins).toBe(2);
		expect(s.homeItems).toEqual(['kite']);
	});

	it('no sequence of taps can make any resource negative', () => {
		let s = withTasks(freshDay());
		const spam = [feedBuddy, feedBuddy, giveCoin, giveCoin, giveCoin, giveCoin, friendDone, saveAll, saveAll, buyLollipop, continueAfterLollipop, jarsDone, jarsDone, goalCelebrated, tuckInDone];
		for (const step of spam) {
			s = step(s);
			expect(s.coins).toBeGreaterThanOrEqual(0);
			expect(s.jarCoins).toBeGreaterThanOrEqual(0);
			expect(s.planks).toBeGreaterThanOrEqual(0);
			expect(s.planks).toBeLessThanOrEqual(SWING_PLANKS);
			expect(s.tidyDone).toBeLessThanOrEqual(3);
			expect(s.waterDone).toBeLessThanOrEqual(3);
		}
	});
});

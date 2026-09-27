import { describe, expect, it } from 'vitest';
import {
	DREAMS,
	FEED_REWARD,
	TIDY_REWARD,
	TIDY_TOYS,
	TOY_PRICES,
	WATER_DROPS,
	WATER_REWARD,
	type ToyId
} from './economy';
import {
	allChoresDone,
	beginDay,
	buyToy,
	dreamCelebrated,
	earnedToday,
	feedBear,
	greetDone,
	newGame,
	nextDream,
	openFeed,
	openTidy,
	openWater,
	resetDayTransients,
	savePreview,
	saveRemainder,
	skipName,
	storeDone,
	submitName,
	tidyToy,
	toStore,
	tuckInDone,
	waterDrop
} from './state';
import type { GameState } from './types';

/** A fresh day at the 'greeting' phase, name already set. */
function freshDay(): GameState {
	let s = newGame();
	s = submitName(s, 'Sam');
	return beginDay(s);
}

/** Arrive at the chores hub. */
function atChores(): GameState {
	return greetDone(freshDay());
}

/** Complete every chore (tidy → water → feed) and stand in the hub. */
function allChores(s: GameState): GameState {
	s = openTidy(s);
	for (let i = 0; i < TIDY_TOYS; i++) s = tidyToy(s);
	s = openWater(s);
	for (let i = 0; i < WATER_DROPS; i++) s = waterDrop(s);
	s = openFeed(s);
	s = feedBear(s);
	return s;
}

/** A day with all chores done, standing in the store. */
function atStore(): GameState {
	return toStore(allChores(atChores()));
}

function withPatch(s: GameState, patch: Partial<GameState>): GameState {
	return { ...s, ...patch };
}

/** Which fields differ between two states — the moral-invariant probe. */
function changedKeys(a: GameState, b: GameState): string[] {
	return (Object.keys(a) as (keyof GameState)[])
		.filter((key) => JSON.stringify(a[key]) !== JSON.stringify(b[key]))
		.sort();
}

describe('new game', () => {
	it('starts at grown-up setup with an empty jar, no toys, and the wagon dream', () => {
		const s = newGame();
		expect(s.schemaVersion).toBe(2);
		expect(s.phase).toBe('setup');
		expect(s.day).toBe(1);
		expect(s.coins).toBe(0);
		expect(s.jarCoins).toBe(0);
		expect(s.goal).toBe('wagon');
		expect(s.owned).toEqual([]);
		expect(s.tidyDone).toBe(0);
		expect(s.waterDone).toBe(0);
		expect(s.fedToday).toBe(false);
		expect(s.earnedTodayCoins).toBe(0);
		expect(s.dreamCompletedToday).toBe(false);
	});
});

describe('grown-up setup', () => {
	it('accepts a name and moves to the start screen', () => {
		const s = submitName(newGame(), '  Sam  ');
		expect(s.childName).toBe('Sam');
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
	it('resets loose coins and every transient, then greets', () => {
		const dirty = withPatch(newGame(), {
			phase: 'start',
			coins: 5,
			tidyDone: 2,
			waterDone: 1,
			fedToday: true,
			earnedTodayCoins: 4,
			savedToday: 4,
			dreamCompletedToday: true
		});
		const s = beginDay(dirty);
		expect(s.phase).toBe('greeting');
		expect(s.coins).toBe(0);
		expect(s.tidyDone).toBe(0);
		expect(s.waterDone).toBe(0);
		expect(s.fedToday).toBe(false);
		expect(s.earnedTodayCoins).toBe(0);
		expect(s.savedToday).toBe(0);
		expect(s.dreamCompletedToday).toBe(false);
	});

	it('does nothing outside the title screen', () => {
		const greeting = beginDay(newGame());
		expect(beginDay(greeting)).toEqual(greeting);
	});
});

describe('the chores hub', () => {
	it('greeting cards lead to the hub, and the hub opens each chore', () => {
		const morning = freshDay();
		expect(greetDone(morning).phase).toBe('chores');

		expect(openTidy(atChores()).phase).toBe('task-tidy');
		expect(openWater(atChores()).phase).toBe('task-water');
		expect(openFeed(atChores()).phase).toBe('task-feed');
	});

	it('tidy pays only when the last toy is tidied, then returns to the hub', () => {
		let s = openTidy(atChores());
		s = tidyToy(s);
		s = tidyToy(s);
		expect(s.coins).toBe(0);
		expect(s.tidyDone).toBe(2);
		expect(s.phase).toBe('task-tidy');

		s = tidyToy(s);
		expect(s.coins).toBe(TIDY_REWARD);
		expect(s.earnedTodayCoins).toBe(TIDY_REWARD);
		expect(s.tidyDone).toBe(TIDY_TOYS);
		expect(s.phase).toBe('chores');
	});

	it('water pays only when the last drop lands, then returns to the hub', () => {
		let s = openWater(atChores());
		s = waterDrop(s);
		s = waterDrop(s);
		expect(s.coins).toBe(0);
		expect(s.waterDone).toBe(2);
		expect(s.phase).toBe('task-water');

		s = waterDrop(s);
		expect(s.coins).toBe(WATER_REWARD);
		expect(s.earnedTodayCoins).toBe(WATER_REWARD);
		expect(s.waterDone).toBe(WATER_DROPS);
		expect(s.phase).toBe('chores');
	});

	it('feeding pays one coin and returns to the hub', () => {
		const s = feedBear(openFeed(atChores()));
		expect(s.coins).toBe(FEED_REWARD);
		expect(s.earnedTodayCoins).toBe(FEED_REWARD);
		expect(s.fedToday).toBe(true);
		expect(s.phase).toBe('chores');
	});

	it('pays every chore exactly once, in any order', () => {
		let s = atChores();
		s = openWater(s);
		for (let i = 0; i < WATER_DROPS; i++) s = waterDrop(s);
		s = openFeed(s);
		s = feedBear(s);
		s = openTidy(s);
		for (let i = 0; i < TIDY_TOYS; i++) s = tidyToy(s);

		expect(s.coins).toBe(TIDY_REWARD + WATER_REWARD + FEED_REWARD);
		expect(s.earnedTodayCoins).toBe(TIDY_REWARD + WATER_REWARD + FEED_REWARD);
		expect(allChoresDone(s)).toBe(true);
		expect(s.phase).toBe('chores');
	});

	it('a finished chore cannot be opened or paid again (tap-spam guard)', () => {
		const done = allChores(atChores());
		expect(openTidy(done)).toEqual(done);
		expect(openWater(done)).toEqual(done);
		expect(openFeed(done)).toEqual(done);
		expect(tidyToy(done)).toEqual(done);
		expect(waterDrop(done)).toEqual(done);
		expect(feedBear(done)).toEqual(done);
	});

	it('clamps repeated taps mid-chore so extra actions cannot mint coins', () => {
		let s = openTidy(atChores());
		for (let i = 0; i < 10; i++) s = tidyToy(s);
		expect(s.tidyDone).toBe(TIDY_TOYS);
		expect(s.coins).toBe(TIDY_REWARD);
		expect(s.earnedTodayCoins).toBe(TIDY_REWARD);
	});

	it('chores cannot be opened outside the hub', () => {
		const morning = freshDay();
		expect(openTidy(morning)).toEqual(morning);
		expect(openWater(morning)).toEqual(morning);
		expect(openFeed(morning)).toEqual(morning);
	});

	it('a day without the feed chore differs only by one coin and the fed flag', () => {
		// The moral invariant: skipping the feed has zero state consequences.
		let quiet = atChores();
		quiet = openTidy(quiet);
		for (let i = 0; i < TIDY_TOYS; i++) quiet = tidyToy(quiet);
		quiet = openWater(quiet);
		for (let i = 0; i < WATER_DROPS; i++) quiet = waterDrop(quiet);
		const unfed = quiet;

		const fed = feedBear(openFeed(unfed));

		expect(fed.phase).toBe(unfed.phase);
		expect(changedKeys(unfed, fed)).toEqual(['coins', 'earnedTodayCoins', 'fedToday']);
		expect(fed.coins - unfed.coins).toBe(FEED_REWARD);
	});
});

describe('all chores done and the store door', () => {
	it('needs every chore, the feed included', () => {
		expect(allChoresDone(atChores())).toBe(false);

		let s = atChores();
		s = openTidy(s);
		for (let i = 0; i < TIDY_TOYS; i++) s = tidyToy(s);
		s = openWater(s);
		for (let i = 0; i < WATER_DROPS; i++) s = waterDrop(s);
		expect(allChoresDone(s)).toBe(false);

		s = openFeed(s);
		s = feedBear(s);
		expect(allChoresDone(s)).toBe(true);
	});

	it('opens the store only from the hub, only with every chore done', () => {
		const morning = atChores();
		expect(toStore(morning)).toEqual(morning);

		const stored = toStore(allChores(morning));
		expect(stored.phase).toBe('store');
		// One way: the door does not open again.
		expect(toStore(stored)).toEqual(stored);
		// Nor outside the hub.
		expect(toStore(freshDay())).toEqual(freshDay());
	});
});

describe('the store: buying toys', () => {
	it('buys an unowned, affordable toy and keeps the day at the store', () => {
		const s = buyToy(atStore(), 'ball');
		expect(s.coins).toBe(TIDY_REWARD + WATER_REWARD + FEED_REWARD - TOY_PRICES.ball);
		expect(s.owned).toEqual(['ball']);
		expect(s.phase).toBe('store');
	});

	it('buys several toys while the coins last', () => {
		let s = withPatch(atStore(), { coins: 6 });
		s = buyToy(s, 'ball');
		s = buyToy(s, 'car');
		expect(s.owned).toEqual(['ball', 'car']);
		expect(s.coins).toBe(0);
	});

	it('denies dreams, owned toys, and unaffordable toys', () => {
		const store = atStore();
		expect(buyToy(store, 'wagon')).toEqual(store);

		const ownsBall = withPatch(store, { owned: ['ball'] as ToyId[] });
		expect(buyToy(ownsBall, 'ball')).toEqual(ownsBall);

		const short = withPatch(store, { coins: TOY_PRICES.ball - 1 });
		expect(buyToy(short, 'ball')).toEqual(short);
	});

	it('denies purchases outside the store and cannot double-buy', () => {
		const hub = allChores(atChores());
		expect(buyToy(hub, 'ball')).toEqual(hub);

		const once = buyToy(atStore(), 'ball');
		expect(buyToy(once, 'ball')).toEqual(once);
	});

	it('ignores unknown toy ids', () => {
		const store = atStore();
		expect(buyToy(store, 'dragon' as ToyId)).toEqual(store);
	});
});

describe('the store: saving the remainder', () => {
	it('moves every held coin into the jar and keeps the day at the store', () => {
		const store = withPatch(atStore(), { coins: 3, jarCoins: 7 });
		const s = saveRemainder(store);
		expect(s.jarCoins).toBe(10);
		expect(s.savedToday).toBe(3);
		expect(s.coins).toBe(0);
		expect(s.phase).toBe('store');
	});

	it('does nothing with empty hands, or outside the store', () => {
		const broke = withPatch(atStore(), { coins: 0 });
		expect(saveRemainder(broke)).toEqual(broke);

		const morning = atChores();
		expect(saveRemainder(morning)).toEqual(morning);
	});

	it('below the dream price the day ends at tuck-in (11 of 12)', () => {
		const s = storeDone(saveRemainder(withPatch(atStore(), { jarCoins: 10, coins: 1 })));
		expect(s.jarCoins).toBe(11);
		expect(s.phase).toBe('tuck-in');
	});

	it('at the dream price the celebration begins (12 of 12)', () => {
		const s = storeDone(saveRemainder(withPatch(atStore(), { jarCoins: 11, coins: 1 })));
		expect(s.jarCoins).toBe(12);
		expect(s.phase).toBe('dream-reached');
	});

	it('over the dream price still celebrates, leaving the remainder (13 of 12)', () => {
		const s = storeDone(withPatch(atStore(), { jarCoins: 13 }));
		expect(s.jarCoins).toBe(13);
		expect(s.phase).toBe('dream-reached');
	});

	it('ending the store is denied outside the store', () => {
		const morning = atChores();
		expect(storeDone(morning)).toEqual(morning);
	});
});

describe('the dream cycle', () => {
	it('celebrating owns the dream, spends its price, and shows the next dream', () => {
		const s = dreamCelebrated(
			withPatch(newGame(), { phase: 'dream-reached', jarCoins: 13, goal: 'wagon' })
		);
		expect(s.dreamCompletedToday).toBe(true);
		expect(s.owned).toEqual(['wagon']);
		expect(s.jarCoins).toBe(1);
		expect(s.goal).toBe('teddy');
		expect(s.phase).toBe('tuck-in');
	});

	it('walks to the first unowned dream, and cycles when all are owned', () => {
		expect([...DREAMS]).toEqual(['wagon', 'teddy']);
		expect(nextDream([])).toBe('wagon');
		expect(nextDream(['wagon'])).toBe('teddy');
		expect(nextDream(['teddy'])).toBe('wagon');
		expect(nextDream(['wagon', 'teddy'])).toBe('wagon');
	});

	it('a second wagon is real: the loop never dead-ends', () => {
		const s = dreamCelebrated(
			withPatch(newGame(), {
				phase: 'dream-reached',
				jarCoins: 12,
				goal: 'wagon',
				owned: ['wagon', 'teddy'] as ToyId[]
			})
		);
		expect(s.owned).toEqual(['wagon', 'teddy', 'wagon']);
		expect(s.goal).toBe('wagon');
		expect(s.jarCoins).toBe(0);
	});

	it('is denied outside the celebration', () => {
		const store = atStore();
		expect(dreamCelebrated(store)).toEqual(store);
	});
});

describe('tuck-in and the next morning', () => {
	it('ends the day: the day number grows and every transient is clean', () => {
		const night = withPatch(atStore(), {
			phase: 'tuck-in',
			day: 1,
			coins: 3,
			tidyDone: TIDY_TOYS,
			waterDone: WATER_DROPS,
			fedToday: true,
			earnedTodayCoins: 4,
			savedToday: 4,
			dreamCompletedToday: true
		});
		const s = tuckInDone(night);
		expect(s.day).toBe(2);
		expect(s.phase).toBe('start');
		expect(s.coins).toBe(0);
		expect(s.tidyDone).toBe(0);
		expect(s.waterDone).toBe(0);
		expect(s.fedToday).toBe(false);
		expect(s.earnedTodayCoins).toBe(0);
		expect(s.savedToday).toBe(0);
		expect(s.dreamCompletedToday).toBe(false);
		// The durable things stay.
		expect(s.jarCoins).toBe(night.jarCoins);
		expect(s.goal).toBe(night.goal);
		expect(s.owned).toEqual(night.owned);
	});

	it('is denied outside tuck-in', () => {
		const store = atStore();
		expect(tuckInDone(store)).toEqual(store);
	});

	it('resetDayTransients zeroes every transient and leaves the phase to its caller', () => {
		const dirty = withPatch(newGame(), {
			phase: 'tuck-in',
			coins: 3,
			tidyDone: 2,
			waterDone: 1,
			fedToday: true,
			earnedTodayCoins: 3,
			savedToday: 2,
			dreamCompletedToday: true
		});
		const clean = resetDayTransients(dirty);
		expect(clean.phase).toBe('tuck-in');
		expect(clean.coins).toBe(0);
		expect(clean.tidyDone).toBe(0);
		expect(clean.waterDone).toBe(0);
		expect(clean.fedToday).toBe(false);
		expect(clean.earnedTodayCoins).toBe(0);
		expect(clean.savedToday).toBe(0);
		expect(clean.dreamCompletedToday).toBe(false);
	});
});

describe('whole days, end to end', () => {
	it('three clean saving days reach the wagon and launch the teddy', () => {
		let s = newGame();
		s = submitName(s, 'Sam');

		// day 1: 4 coins, jar 4
		s = beginDay(s);
		s = storeDone(saveRemainder(toStore(allChores(greetDone(s)))));
		expect(s.phase).toBe('tuck-in');
		expect(s.jarCoins).toBe(4);
		s = tuckInDone(s);

		// day 2: jar 8
		s = beginDay(s);
		s = storeDone(saveRemainder(toStore(allChores(greetDone(s)))));
		expect(s.phase).toBe('tuck-in');
		expect(s.jarCoins).toBe(8);
		s = tuckInDone(s);

		// day 3: jar 12 — the dream is reached
		s = beginDay(s);
		s = storeDone(saveRemainder(toStore(allChores(greetDone(s)))));
		expect(s.phase).toBe('dream-reached');
		expect(s.jarCoins).toBe(12);

		s = dreamCelebrated(s);
		expect(s.owned).toEqual(['wagon']);
		expect(s.goal).toBe('teddy');
		expect(s.jarCoins).toBe(0);
		expect(s.phase).toBe('tuck-in');
	});

	it('a toy in the store delays the dream, and the remainder still saves', () => {
		let s = beginDay(submitName(newGame(), 'Sam'));
		s = toStore(allChores(greetDone(s)));
		s = buyToy(s, 'ball');
		expect(s.coins).toBe(2);
		expect(s.owned).toEqual(['ball']);

		s = storeDone(saveRemainder(s));
		expect(s.phase).toBe('tuck-in');
		expect(s.jarCoins).toBe(2);
	});

	it('no sequence of taps can make any resource negative', () => {
		let s = atChores();
		for (let round = 0; round < 5; round++) {
			s = openTidy(s);
			for (let i = 0; i < 5; i++) s = tidyToy(s);
			s = openWater(s);
			for (let i = 0; i < 5; i++) s = waterDrop(s);
			s = openFeed(s);
			s = feedBear(s);
			s = toStore(s);
			s = buyToy(s, 'ball');
			s = buyToy(s, 'wagon');
			s = saveRemainder(s);
			s = storeDone(s);
			s = dreamCelebrated(s);
			s = tuckInDone(s);
			s = beginDay(s);
			s = greetDone(s);

			expect(s.coins).toBeGreaterThanOrEqual(0);
			expect(s.jarCoins).toBeGreaterThanOrEqual(0);
			expect(s.tidyDone).toBeGreaterThanOrEqual(0);
			expect(s.tidyDone).toBeLessThanOrEqual(TIDY_TOYS);
			expect(s.waterDone).toBeGreaterThanOrEqual(0);
			expect(s.waterDone).toBeLessThanOrEqual(WATER_DROPS);
		}
	});
});

describe('earned today', () => {
	it('counts every chore payment, however the day later spends it', () => {
		expect(earnedToday(atChores())).toBe(0);

		let s = openTidy(atChores());
		for (let i = 0; i < TIDY_TOYS; i++) s = tidyToy(s);
		expect(earnedToday(s)).toBe(TIDY_REWARD);

		s = openWater(s);
		for (let i = 0; i < WATER_DROPS; i++) s = waterDrop(s);
		expect(earnedToday(s)).toBe(TIDY_REWARD + WATER_REWARD);

		s = feedBear(openFeed(s));
		expect(earnedToday(s)).toBe(4);

		s = buyToy(toStore(s), 'ball');
		expect(earnedToday(s)).toBe(4);

		s = saveRemainder(s);
		expect(earnedToday(s)).toBe(4);
	});

	it('resets with the day', () => {
		let s = allChores(atChores());
		expect(earnedToday(s)).toBe(4);
		s = tuckInDone(withPatch(s, { phase: 'tuck-in' }));
		expect(earnedToday(s)).toBe(0);
		s = beginDay(s);
		expect(earnedToday(s)).toBe(0);
	});
});

describe('the save preview', () => {
	it('counts the jar plus the hand against the dream price', () => {
		expect(savePreview(withPatch(newGame(), { jarCoins: 10, coins: 2 }))).toEqual({
			filled: 12,
			completes: true
		});
		expect(savePreview(withPatch(newGame(), { jarCoins: 11, coins: 0 }))).toEqual({
			filled: 11,
			completes: false
		});
		expect(savePreview(withPatch(newGame(), { jarCoins: 8, coins: 3 }))).toEqual({
			filled: 11,
			completes: false
		});
	});

	it('moves with the current dream', () => {
		expect(savePreview(withPatch(newGame(), { goal: 'teddy', jarCoins: 4, coins: 2 }))).toEqual({
			filled: 6,
			completes: false
		});
		expect(savePreview(withPatch(newGame(), { goal: 'teddy', jarCoins: 12, coins: 0 }))).toEqual({
			filled: 12,
			completes: true
		});
	});

	it('starts empty', () => {
		expect(savePreview(newGame())).toEqual({ filled: 0, completes: false });
	});
});

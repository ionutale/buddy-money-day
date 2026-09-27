import {
	FEED_COST,
	GOALS,
	GOAL_COST,
	LOLLIPOP_COST,
	SWING_PLANKS,
	TIDY_REWARD,
	TIDY_TOYS,
	WATER_DROPS,
	WATER_REWARD,
	type GoalId
} from './economy';
import { SCHEMA_VERSION, type GameState } from './types';

/**
 * The whole game is a set of pure, immutable transitions over GameState.
 * Every guard makes out-of-phase or unaffordable actions a no-op, so
 * tap-spam can never double-apply or drive a resource negative.
 */

function withState(s: GameState, patch: Partial<GameState>): GameState {
	return { ...s, ...patch };
}

/** Coins in hand and progress within the day do not survive a reload; the jar does. */
export function resetDayTransients(s: GameState): GameState {
	return withState(s, {
		coins: 0,
		tidyDone: 0,
		waterDone: 0,
		fedToday: false,
		gaveToday: 0,
		lollipopToday: false
	});
}

export function newGame(): GameState {
	return {
		schemaVersion: SCHEMA_VERSION,
		childName: '',
		nameSkipped: false,
		day: 1,
		goal: GOALS[0],
		jarCoins: 0,
		homeItems: [],
		planks: 0,
		buddySad: false,
		lollipopsTotal: 0,
		phase: 'setup',
		coins: 0,
		tidyDone: 0,
		waterDone: 0,
		fedToday: false,
		gaveToday: 0,
		lollipopToday: false
	};
}

export function submitName(s: GameState, rawName: string): GameState {
	if (s.phase !== 'setup') return s;
	return withState(s, {
		childName: rawName.trim().slice(0, 24),
		nameSkipped: false,
		phase: 'start'
	});
}

export function skipName(s: GameState): GameState {
	if (s.phase !== 'setup') return s;
	return withState(s, { nameSkipped: true, phase: 'start' });
}

export function beginDay(s: GameState): GameState {
	if (s.phase !== 'start') return s;
	return withState(resetDayTransients(s), { phase: 'greeting' });
}

export function greetDone(s: GameState): GameState {
	if (s.phase !== 'greeting') return s;
	return withState(s, { phase: 'task-tidy' });
}

export function tidyToy(s: GameState): GameState {
	if (s.phase !== 'task-tidy') return s;
	const tidyDone = Math.min(s.tidyDone + 1, TIDY_TOYS);
	if (tidyDone === s.tidyDone) return s;
	const finished = tidyDone === TIDY_TOYS;
	return withState(s, {
		tidyDone,
		coins: s.coins + (finished ? TIDY_REWARD : 0),
		phase: finished ? 'task-water' : 'task-tidy'
	});
}

export function waterDrop(s: GameState): GameState {
	if (s.phase !== 'task-water') return s;
	const waterDone = Math.min(s.waterDone + 1, WATER_DROPS);
	if (waterDone === s.waterDone) return s;
	const finished = waterDone === WATER_DROPS;
	return withState(s, {
		waterDone,
		coins: s.coins + (finished ? WATER_REWARD : 0),
		phase: finished ? 'hunger' : 'task-water'
	});
}

export function feedBuddy(s: GameState): GameState {
	if (s.phase !== 'hunger' || s.coins < FEED_COST) return s;
	return withState(s, {
		coins: s.coins - FEED_COST,
		fedToday: true,
		buddySad: false,
		phase: 'friend'
	});
}

export function skipFeed(s: GameState): GameState {
	if (s.phase !== 'hunger') return s;
	return withState(s, { phase: 'friend' });
}

export function giveCoin(s: GameState): GameState {
	if (s.phase !== 'friend') return s;
	if (s.coins < 1 || s.planks >= SWING_PLANKS || s.gaveToday >= SWING_PLANKS) return s;
	return withState(s, {
		coins: s.coins - 1,
		planks: s.planks + 1,
		gaveToday: s.gaveToday + 1
	});
}

export function friendDone(s: GameState): GameState {
	if (s.phase !== 'friend') return s;
	return withState(s, { phase: 'shelf' });
}

export function saveAll(s: GameState): GameState {
	if (s.phase !== 'shelf') return s;
	return withState(s, { jarCoins: s.jarCoins + s.coins, coins: 0, phase: 'jars' });
}

export function buyLollipop(s: GameState): GameState {
	if (s.phase !== 'shelf' || s.lollipopToday || s.coins < LOLLIPOP_COST) return s;
	return withState(s, {
		coins: s.coins - LOLLIPOP_COST,
		lollipopToday: true,
		lollipopsTotal: s.lollipopsTotal + 1
	});
}

export function continueAfterLollipop(s: GameState): GameState {
	if (s.phase !== 'shelf' || !s.lollipopToday) return s;
	return withState(s, { jarCoins: s.jarCoins + s.coins, coins: 0, phase: 'jars' });
}

export function jarsDone(s: GameState): GameState {
	if (s.phase !== 'jars') return s;
	return withState(s, { phase: s.jarCoins >= GOAL_COST ? 'goal-reached' : 'tuck-in' });
}

export function goalCelebrated(s: GameState): GameState {
	if (s.phase !== 'goal-reached') return s;
	return withState(s, { phase: 'goal-pick' });
}

export function pickGoal(s: GameState, goal: GoalId): GameState {
	if (s.phase !== 'goal-pick' || !GOALS.includes(goal)) return s;
	return withState(s, {
		homeItems: [...s.homeItems, s.goal],
		jarCoins: Math.max(0, s.jarCoins - GOAL_COST),
		goal,
		phase: 'tuck-in'
	});
}

export function tuckInDone(s: GameState): GameState {
	if (s.phase !== 'tuck-in') return s;
	return withState(resetDayTransients(s), {
		buddySad: !s.fedToday,
		day: s.day + 1,
		phase: 'start'
	});
}

/** Always three Goal choices, preferring ones never collected. Stable order. */
export function nextGoalOptions(s: GameState): GoalId[] {
	const uncollected = GOALS.filter((g) => !s.homeItems.includes(g));
	const collected = GOALS.filter((g) => s.homeItems.includes(g));
	return [...uncollected, ...collected].slice(0, GOALS.length);
}

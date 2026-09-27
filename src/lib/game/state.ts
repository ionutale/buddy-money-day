import {
	DREAMS,
	FEED_REWARD,
	TIDY_REWARD,
	TIDY_TOYS,
	TOY_KIND,
	TOY_PRICES,
	TOYS,
	WATER_DROPS,
	WATER_REWARD,
	type ToyId
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
		earnedTodayCoins: 0,
		savedToday: 0,
		dreamCompletedToday: false
	});
}

export function newGame(): GameState {
	return {
		schemaVersion: SCHEMA_VERSION,
		childName: '',
		nameSkipped: false,
		day: 1,
		goal: DREAMS[0],
		jarCoins: 0,
		owned: [],
		phase: 'setup',
		dreamCompletedToday: false,
		savedToday: 0,
		coins: 0,
		tidyDone: 0,
		waterDone: 0,
		fedToday: false,
		earnedTodayCoins: 0
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
	return withState(s, { phase: 'chores' });
}

/** The three chore doors, open from the hub once each per day, any order. */
export function openTidy(s: GameState): GameState {
	if (s.phase !== 'chores' || s.tidyDone > 0) return s;
	return withState(s, { phase: 'task-tidy' });
}

export function openWater(s: GameState): GameState {
	if (s.phase !== 'chores' || s.waterDone > 0) return s;
	return withState(s, { phase: 'task-water' });
}

export function openFeed(s: GameState): GameState {
	if (s.phase !== 'chores' || s.fedToday) return s;
	return withState(s, { phase: 'task-feed' });
}

export function tidyToy(s: GameState): GameState {
	if (s.phase !== 'task-tidy') return s;
	const tidyDone = Math.min(s.tidyDone + 1, TIDY_TOYS);
	if (tidyDone === s.tidyDone) return s;
	const finished = tidyDone === TIDY_TOYS;
	return withState(s, {
		tidyDone,
		coins: s.coins + (finished ? TIDY_REWARD : 0),
		earnedTodayCoins: s.earnedTodayCoins + (finished ? TIDY_REWARD : 0),
		phase: finished ? 'chores' : 'task-tidy'
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
		earnedTodayCoins: s.earnedTodayCoins + (finished ? WATER_REWARD : 0),
		phase: finished ? 'chores' : 'task-water'
	});
}

/** Feeding is a paid job: one coin earned, a happy bear, no cost and no skip. */
export function feedBear(s: GameState): GameState {
	if (s.phase !== 'task-feed') return s;
	return withState(s, {
		coins: s.coins + FEED_REWARD,
		earnedTodayCoins: s.earnedTodayCoins + FEED_REWARD,
		fedToday: true,
		phase: 'chores'
	});
}

/** All three chores, feed included, before the store unlocks. */
export function allChoresDone(s: GameState): boolean {
	return s.tidyDone >= TIDY_TOYS && s.waterDone >= WATER_DROPS && s.fedToday;
}

export function toStore(s: GameState): GameState {
	if (s.phase !== 'chores' || !allChoresDone(s)) return s;
	return withState(s, { phase: 'store' });
}

/** Toys are deliberate buys: unowned, affordable, store-only. Dreams wait for the jar. */
export function buyToy(s: GameState, id: ToyId): GameState {
	if (s.phase !== 'store') return s;
	if (!TOYS.includes(id)) return s;
	if (TOY_KIND[id] !== 'toy' || s.owned.includes(id)) return s;
	if (s.coins < TOY_PRICES[id]) return s;
	return withState(s, { coins: s.coins - TOY_PRICES[id], owned: [...s.owned, id] });
}

/** The default path stays saving (ADR-0002): every held coin goes to the jar. */
export function saveRemainder(s: GameState): GameState {
	if (s.phase !== 'store' || s.coins === 0) return s;
	return withState(s, {
		jarCoins: s.jarCoins + s.coins,
		savedToday: s.savedToday + s.coins,
		coins: 0
	});
}

export function storeDone(s: GameState): GameState {
	if (s.phase !== 'store') return s;
	return withState(s, {
		phase: s.jarCoins >= TOY_PRICES[s.goal] ? 'dream-reached' : 'tuck-in'
	});
}

/** The first dream not owned yet; once every dream is owned the list cycles. */
export function nextDream(owned: readonly ToyId[]): ToyId {
	return DREAMS.find((dream) => !owned.includes(dream)) ?? DREAMS[0];
}

export function dreamCelebrated(s: GameState): GameState {
	if (s.phase !== 'dream-reached') return s;
	const owned = [...s.owned, s.goal];
	return withState(s, {
		dreamCompletedToday: true,
		owned,
		jarCoins: Math.max(0, s.jarCoins - TOY_PRICES[s.goal]),
		goal: nextDream(owned),
		phase: 'tuck-in'
	});
}

export function tuckInDone(s: GameState): GameState {
	if (s.phase !== 'tuck-in') return s;
	return withState(resetDayTransients(s), { day: s.day + 1, phase: 'start' });
}

/** What today's chores paid, however the day later saved or spent it. */
export function earnedToday(s: GameState): number {
	return s.earnedTodayCoins;
}

/** What the jar would hold if the hand's coins were saved right now. */
export function savePreview(s: GameState): { filled: number; completes: boolean } {
	const price = TOY_PRICES[s.goal];
	const total = s.jarCoins + s.coins;
	return { filled: Math.min(total, price), completes: total >= price };
}

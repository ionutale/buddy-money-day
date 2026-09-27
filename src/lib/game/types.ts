import type { ToyId } from './economy';

export const SCHEMA_VERSION = 2;

/**
 * One phase of the game. A Money Day runs
 * greeting → chores (task-tidy | task-water | task-feed, any order, each once)
 * → store → (dream-reached)? → tuck-in, then back to start.
 */
export type Phase =
	| 'setup'
	| 'start'
	| 'greeting'
	| 'chores'
	| 'task-tidy'
	| 'task-water'
	| 'task-feed'
	| 'store'
	| 'dream-reached'
	| 'tuck-in';

export type GameState = {
	schemaVersion: typeof SCHEMA_VERSION;
	/** First name for spoken praise; '' when skipped. Local-only, never sent anywhere. */
	childName: string;
	nameSkipped: boolean;
	/** 1-based count of Money Days that have been tucked in. */
	day: number;

	/** Durable progress — survives reloads. */
	/** The dream being saved for; always a dream toy. */
	goal: ToyId;
	jarCoins: number;
	/** Toys bought at the store and dreams celebrated, in acquisition order. */
	owned: ToyId[];

	/** Transient day state — reset at every beginDay and on load. */
	phase: Phase;
	/** True from the dream celebration until tuck-in; drives the recap. */
	dreamCompletedToday: boolean;
	/** Coins moved into the jar today — the store's bookkeeping. */
	savedToday: number;
	coins: number;
	tidyDone: number;
	waterDone: number;
	/** The feed chore's done-flag; never a hunger that persists. */
	fedToday: boolean;
	/** Every chore payment today, however it was later spent. */
	earnedTodayCoins: number;
};

import type { GoalId } from './economy';

export const SCHEMA_VERSION = 1;

/**
 * One phase of the game. A Money Day runs
 * greeting → task-tidy → task-water → hunger → friend → shelf → jars
 * → (goal-reached → goal-pick)? → tuck-in, then back to start.
 */
export type Phase =
	| 'setup'
	| 'start'
	| 'greeting'
	| 'task-tidy'
	| 'task-water'
	| 'hunger'
	| 'friend'
	| 'shelf'
	| 'jars'
	| 'goal-reached'
	| 'goal-pick'
	| 'tuck-in';

export type GameState = {
	schemaVersion: typeof SCHEMA_VERSION;
	/** First name for spoken praise; '' when skipped. Local-only, never sent anywhere. */
	childName: string;
	nameSkipped: boolean;
	/** 1-based count of Money Days that have been tucked in. */
	day: number;

	/** Durable progress — survives reloads. */
	goal: GoalId;
	jarCoins: number;
	homeItems: GoalId[];
	planks: number;
	buddySad: boolean;
	lollipopsTotal: number;

	/** Transient day state — reset at every beginDay and on load. */
	phase: Phase;
	/** True from the Goal celebration until tuck-in; drives the recap. */
	goalCompletedToday: boolean;
	/** Coins saved into the jar today — the recap's earned-today bookkeeping. */
	savedToday: number;
	coins: number;
	tidyDone: number;
	waterDone: number;
	fedToday: boolean;
	gaveToday: number;
	lollipopToday: boolean;
};

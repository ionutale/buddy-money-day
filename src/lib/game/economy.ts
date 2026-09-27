/**
 * Every number the game economy depends on.
 * Tests and scenes assert against these names, never raw numbers.
 */
export const TIDY_TOYS = 3;
export const WATER_DROPS = 3;

/** Coins paid when a Helping Task's last action lands. */
export const TIDY_REWARD = 2;
export const WATER_REWARD = 1;

/** Coins removed by deliberate spends. */
export const FEED_COST = 1;
export const LOLLIPOP_COST = 2;

/** The bird's swing needs this many planks (one per coin given). */
export const SWING_PLANKS = 3;

/** Coins the Save Jar must hold before a Goal is reached. */
export const GOAL_COST = 6;

export const GOALS = ['kite', 'hat', 'slide'] as const;
export type GoalId = (typeof GOALS)[number];

/** Spoken and label forms of each Goal. */
export const GOAL_LABELS: Record<GoalId, string> = {
	kite: 'kite',
	hat: 'funny hat',
	slide: 'little slide'
};

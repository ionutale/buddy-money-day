import type { GoalId } from './economy';
import { clearSave, loadState, saveState } from './persistence';
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

/**
 * The one mutable thing in the app: a runes store wrapping the pure engine.
 * Every action applies its transition and persists the durable result.
 * Speech and sound are hooks in the scenes, never here.
 */
export const game = $state({ state: loadState() });

type Transition = (s: GameState) => GameState;

function apply(transition: Transition): void {
	game.state = transition(game.state);
	saveState(game.state);
}

export const actions = {
	submitName: (name: string) => apply((s) => submitName(s, name)),
	skipName: () => apply(skipName),

	beginDay: () => apply(beginDay),
	greetDone: () => apply(greetDone),

	tidyToy: () => apply(tidyToy),
	waterDrop: () => apply(waterDrop),

	feedBuddy: () => apply(feedBuddy),
	skipFeed: () => apply(skipFeed),

	giveCoin: () => apply(giveCoin),
	friendDone: () => apply(friendDone),

	saveAll: () => apply(saveAll),
	buyLollipop: () => apply(buyLollipop),
	continueAfterLollipop: () => apply(continueAfterLollipop),

	jarsDone: () => apply(jarsDone),
	goalCelebrated: () => apply(goalCelebrated),
	pickGoal: (goal: GoalId) => apply((s) => pickGoal(s, goal)),
	tuckInDone: () => apply(tuckInDone),

	/** Wipe the per-device save and start over at Grown-up Setup. */
	reset: (): void => {
		clearSave();
		game.state = newGame();
	}
};

/** Same as actions.reset(), for callers that prefer a bare function. */
export function reset(): void {
	actions.reset();
}

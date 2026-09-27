import type { ToyId } from './economy';
import { clearSave, loadState, saveState } from './persistence';
import {
	beginDay,
	buyToy,
	dreamCelebrated,
	feedBear,
	greetDone,
	newGame,
	openFeed,
	openTidy,
	openWater,
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

	openTidy: () => apply(openTidy),
	openWater: () => apply(openWater),
	openFeed: () => apply(openFeed),
	tidyToy: () => apply(tidyToy),
	waterDrop: () => apply(waterDrop),
	feedBear: () => apply(feedBear),

	toStore: () => apply(toStore),
	buyToy: (id: ToyId) => apply((s) => buyToy(s, id)),
	saveRemainder: () => apply(saveRemainder),
	storeDone: () => apply(storeDone),

	dreamCelebrated: () => apply(dreamCelebrated),
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

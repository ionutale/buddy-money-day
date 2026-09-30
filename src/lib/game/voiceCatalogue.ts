import { DREAMS, TOY_PRICES } from './economy';
import { spoken, TOGGLE_ON } from './spoken';
import { newGame } from './state';
import type { GameState } from './types';

/**
 * Every fragment the game can ever say, deduplicated. Pure: the build script
 * writes these to disk; the drift test compares them to the committed map.
 */

/** A dream costs 12 coins — the deepest jar the dream-state and recap describe. */
const MAX_JAR = 12;
/** TIDY 2 + WATER 1 + FEED 1 — the most a single day can pay. */
const MAX_EARNED = 4;

function s(patch: Partial<GameState> = {}): GameState {
	return { ...newGame(), ...patch };
}

export function collectFragments(): string[] {
	const texts = new Set<string>();
	const add = (fragments: string[]) => fragments.forEach((f) => texts.add(f));

	// Name-free lines: one call each, in both setup variants.
	add(spoken.setup(s({ childName: '', nameSkipped: true })));
	add(spoken.setup(s({ childName: 'Sam' })));
	add(spoken.voiceSample(s()));
	add(spoken.start(s()));
	add(spoken.tidy(s()));
	add(spoken.tidyPaid(s()));
	add(spoken.tidyNudge(s()));
	add(spoken.water(s()));
	add(spoken.waterPaid(s()));
	add(spoken.feed(s()));
	add(spoken.feedPaid(s()));
	add(spoken.cap(s()));
	add(spoken.storeBought(s()));
	add(spoken.storeOwned(s()));
	add(spoken.toysEmpty(s()));
	add([TOGGLE_ON]);

	for (const goal of DREAMS) {
		add(spoken.planLine(s({ goal })));
		add(spoken.greetingPlan(s({ goal })));
		add(spoken.store(s({ goal })));
		add(spoken.storeSave(s({ goal })));
		add(spoken.dreamReached(s({ goal })));
		for (let jar = 0; jar <= MAX_JAR; jar++) {
			add(spoken.dreamStands(s({ goal, jarCoins: jar })));
		}
		for (let earned = 0; earned <= MAX_EARNED; earned++) {
			for (let jar = 0; jar <= MAX_JAR; jar++) {
				add(spoken.recapLine(s({ goal, jarCoins: jar, earnedTodayCoins: earned })));
			}
		}
		add(spoken.recapLine(s({
			goal,
			dreamCompletedToday: true,
			owned: [DREAMS.find((d) => d !== goal) ?? goal]
		})));
	}

	// The store sells only the ball (slice 1); a compare fires only when the
	// child cannot afford it, so only coins < its price are sayable.
	for (let coins = 0; coins < TOY_PRICES.ball; coins++) {
		add(spoken.storeCompare('ball', s({ coins })));
	}

	return [...texts].sort();
}

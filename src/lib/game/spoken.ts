import { TOY_LABELS, TOY_PRICES, type ToyId } from './economy';
import { lines, moreChores } from './lines';
import type { GameState } from './types';

/**
 * What Buddy actually says, one clip-fragment per array entry. Every line that
 * carries no name reuses `lines.ts` verbatim, so the voice can never drift from
 * the on-screen words; only the name-bearing and combinatorial lines are built
 * here.
 *
 * The child's name is deliberately absent: a name is arbitrary input and can
 * never be pre-rendered. Fragments are short on purpose so the combinatorial
 * lines (recap, compare) dedupe instead of exploding into hundreds of files.
 */

export const TOGGLE_ON = 'Voice on!';

export const spoken = {
	setup: (s) => (s.childName.trim() === '' ? [lines.setup(s)] : ['Hello again!']),

	voiceSample: (s) => [lines.voiceSample(s)],

	start: (_s) => ['Hi! Buddy is ready for a Money Day.'],

	planLine: (s) => [lines.planLine(s)],

	greetingPlan: (s) => ['Good morning!', lines.planLine(s)],

	tidy: (s) => [lines.tidy(s)],
	tidyPaid: (s) => [lines.tidyPaid(s)],
	tidyNudge: (s) => [lines.tidyNudge(s)],

	water: (s) => [lines.water(s)],
	waterPaid: (s) => [lines.waterPaid(s)],

	feed: (s) => [lines.feed(s)],
	feedPaid: (s) => [lines.feedPaid(s)],

	cap: (s) => [lines.cap(s)],

	store: (s) => [lines.store(s)],
	storeSave: (s) => [lines.storeSave(s)],
	storeBought: (s) => [lines.storeBought(s)],
	storeOwned: (s) => [lines.storeOwned(s)],

	dreamStands: (s) => [lines.dreamStands(s)],

	storeCompare: (toy: ToyId, s: GameState) => {
		const price = TOY_PRICES[toy];
		const short = Math.max(0, price - s.coins);
		return [`That's ${price} coins — you have ${s.coins}.`, moreChores(short)];
	},

	toysEmpty: (s) => [lines.toysEmpty(s)],

	dreamReached: (s) => [
		`You did it! You saved ${TOY_PRICES[s.goal]} coins for your very own ${TOY_LABELS[s.goal]}!`
	],

	recapLine: (s) => {
		if (s.dreamCompletedToday) {
			const done = s.owned.at(-1) ?? s.goal;
			return [
				'You did it!',
				`The ${TOY_LABELS[done]} is yours.`,
				`Your ${TOY_LABELS[s.goal]} needs ${TOY_PRICES[s.goal]} coins — we can start tomorrow!`
			];
		}
		const earned = s.earnedTodayCoins;
		const earnedText = `Today you earned ${earned} coin${earned === 1 ? '' : 's'}.`;
		if (s.jarCoins > 0) {
			return [earnedText, lines.dreamStands(s), moreChores(TOY_PRICES[s.goal] - s.jarCoins)];
		}
		return [earnedText, lines.dreamStands(s), 'Tomorrow we can earn more!'];
	}
} satisfies Record<keyof typeof lines, (s: GameState) => string[]> & {
	storeCompare: (toy: ToyId, s: GameState) => string[];
};

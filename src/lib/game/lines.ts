import {
	FEED_REWARD,
	TIDY_REWARD,
	TOY_LABELS,
	TOY_PRICES,
	WATER_REWARD,
	type ToyId
} from './economy';
import type { GameState } from './types';

/**
 * Every spoken line in the game lives here, name-interpolated with a warm
 * "friend" fallback when no name was given. Text on screen only ever
 * accompanies these lines — no reading required to play.
 *
 * The meaning-layer lines follow one grammar: the reason (why the world needs
 * it), the deal (what you get), and the dream-state line (where it puts you
 * toward the Dream toy). Buys restate the dream without reproach.
 */

export function buddyName(s: Pick<GameState, 'childName'>): string {
	const name = s.childName.trim();
	return name === '' ? 'friend' : name;
}

type Line = (s: GameState) => string;

function planText(s: GameState): string {
	return `Today we can earn ${TIDY_REWARD + WATER_REWARD + FEED_REWARD} coins for your ${TOY_LABELS[s.goal]}!`;
}

function dreamStandsText(s: GameState): string {
	const label = TOY_LABELS[s.goal];
	if (s.jarCoins >= TOY_PRICES[s.goal]) return `Your ${label} is yours!`;
	return `Your ${label} has ${s.jarCoins} of ${TOY_PRICES[s.goal]}.`;
}

/** "5 more chores tomorrow!" — honest arithmetic, never a scold. */
function moreChores(n: number): string {
	// Nothing left to earn (latent: the recap only asks when n > 0): a neutral
	// sign-off, never "one more" for a zero.
	if (n <= 0) return 'More chores tomorrow!';
	if (n === 1) return 'One more chore tomorrow!';
	if (n === 2) return 'Two more chores tomorrow!';
	return `${n} more chores tomorrow!`;
}

/** The honest compare when a toy is out of reach. Never shaming, always clear. */
export function storeCompare(toy: ToyId, s: GameState): string {
	const price = TOY_PRICES[toy];
	const short = Math.max(0, price - s.coins);
	return `That's ${price} coins — you have ${s.coins}. ${moreChores(short)}`;
}

export const lines = {
	// Grown-up Setup is parent-facing, but Buddy says hello anyway.
	setup: (s) =>
		s.childName.trim() === ''
			? 'Hello! A grown-up can type a name, or skip.'
			: `Hello again, ${s.childName.trim()}!`,

	/** Preview line when a grown-up picks Buddy's voice actor. */
	voiceSample: (_s) => 'Hi there! This is how Buddy will sound.',

	// Title screen.
	start: (s) => `Hi ${buddyName(s)}! Buddy is ready for a Money Day.`,

	// Greeting, with the whole day's plan in one spoken breath.
	planLine: planText,
	greetingPlan: (s) => `Good morning, ${buddyName(s)}! ${planText(s)}`,

	// Chore: tidy the toys. (Reason + deal.)
	tidy: (_s) => "Look at this mess! Tidy the toys — I'll pay you two coins!",
	tidyPaid: (_s) => 'Two coins earned!',
	tidyNudge: (_s) => 'Drag the toy all the way into the box!',

	// Chore: water the tree. (Reason + deal.)
	water: (_s) => 'The little tree is thirsty! Water it — one coin!',
	waterPaid: (_s) => 'One coin earned!',

	// Chore: feed the bear. A paid job — no cost, no skip, no sadness.
	feed: (_s) => "I'm hungry! Feed me and I'll pay you a coin!",
	feedPaid: (_s) => 'One coin earned!',

	// All chores done.
	cap: (_s) => 'All chores done! More tomorrow.',

	// The store: saving by default, buying deliberately.
	store: (s) => `Time to choose! A toy now, or save for your ${TOY_LABELS[s.goal]}?`,
	storeSave: (s) => `Save the rest for your ${TOY_LABELS[s.goal]}.`,
	storeBought: (_s) => "It's in your room!",
	storeOwned: (_s) => 'In your room!',
	dreamStands: dreamStandsText,

	// My Toys: the room behind the title door. Empty is a hint, never a scold.
	toysEmpty: (_s) => 'No toys yet! Do chores, then visit the store.',

	// The dream celebration and the dream-state voice.
	dreamReached: (s) =>
		`You did it, ${buddyName(s)}! You saved ${TOY_PRICES[s.goal]} coins for your very own ${TOY_LABELS[s.goal]}!`,

	// Tuck-in recap: the honest bookend.
	recapLine: (s) => {
		if (s.dreamCompletedToday) {
			const done = s.owned.at(-1) ?? s.goal;
			return `You did it! The ${TOY_LABELS[done]} is yours. Your ${TOY_LABELS[s.goal]} needs ${TOY_PRICES[s.goal]} coins — we can start tomorrow!`;
		}
		const earned = s.earnedTodayCoins;
		const earnedText = `${earned} coin${earned === 1 ? '' : 's'}`;
		if (s.jarCoins > 0) {
			const remaining = TOY_PRICES[s.goal] - s.jarCoins;
			return `Today you earned ${earnedText}. Your ${TOY_LABELS[s.goal]} has ${s.jarCoins} of ${TOY_PRICES[s.goal]} — ${moreChores(remaining)}`;
		}
		return `Today you earned ${earnedText}. Your ${TOY_LABELS[s.goal]} has 0 of ${TOY_PRICES[s.goal]}. Tomorrow we can earn more!`;
	}
} satisfies Record<string, Line>;

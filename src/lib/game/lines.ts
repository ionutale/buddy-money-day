import { GOAL_COST, GOAL_LABELS, TIDY_REWARD, WATER_REWARD } from './economy';
import { earnedToday } from './state';
import type { GameState } from './types';

/**
 * Every spoken line in the game lives here, name-interpolated with a warm
 * "friend" fallback when no name was given. Text on screen only ever
 * accompanies these lines — no reading required to play.
 *
 * The meaning-layer lines follow one grammar: the reason (why the world needs
 * it), the deal (what you get), and the goal-state line (where it puts you
 * toward the Goal). Spends restate the Goal without reproach.
 */

export function buddyName(s: Pick<GameState, 'childName'>): string {
	const name = s.childName.trim();
	return name === '' ? 'friend' : name;
}

type Line = (s: GameState) => string;

function planText(s: GameState): string {
	return `Today we can earn ${TIDY_REWARD + WATER_REWARD} coins for your ${GOAL_LABELS[s.goal]}!`;
}

function goalStandsText(s: GameState): string {
	const label = GOAL_LABELS[s.goal];
	if (s.jarCoins >= GOAL_COST) return `Your ${label} is yours!`;
	return `Your ${label} has ${s.jarCoins} of ${GOAL_COST}.`;
}

function goalStillText(s: GameState): string {
	return `Your ${GOAL_LABELS[s.goal]} still has ${s.jarCoins} of ${GOAL_COST}.`;
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
	greeting: (s) => `Good morning, ${buddyName(s)}! Buddy is so happy to see you!`,
	greetingSad: (s) =>
		`Good morning, ${buddyName(s)}. Buddy's tummy is still a little rumbly. Can we feed Buddy today?`,
	planLine: planText,
	greetingPlan: (s) => `Good morning, ${buddyName(s)}! ${planText(s)}`,

	// Helping Task: tidy the toys. (Reason + deal.)
	tidy: (_s) => "Look at this mess! Tidy the toys — I'll pay you two coins!",
	tidyPaid: (_s) => 'Two coins earned!',
	tidyNudge: (_s) => 'Drag the toy all the way into the box!',

	// Helping Task: water the tree. (Reason + deal.)
	water: (_s) => 'The little tree is thirsty! Water it — one coin!',
	waterPaid: (_s) => 'One coin earned!',

	// Hunger — Buddy's need, and where the spend leaves the Goal.
	hunger: (_s) => "Buddy's tummy is rumbling! Feed Buddy for one coin?",
	hungerNoCoin: (_s) => 'Buddy needs one coin. Maybe we can help Buddy later.',
	hungerSpent: (s) => `One coin for food. ${goalStillText(s)}`,

	// The Friend with the broken swing.
	friend: (_s) => "The bird's swing is broken! One coin builds one plank!",
	friendGive: (_s) => 'One plank! The bird is so happy!',
	friendGiveGoal: (s) => `One plank! The bird is so happy. ${goalStillText(s)}`,
	friendDone: (s) => `You are a good friend, ${buddyName(s)}.`,
	friendNothing: (_s) => "That's okay. The bird is glad to see you.",

	// The Shelf: saving by default, the lollipop deliberately.
	shelf: (s) =>
		`Time to choose! Coins in the jar for your ${GOAL_LABELS[s.goal]}, or a lollipop right now?`,
	shelfSave: (s) => `Clink! Saving for your ${GOAL_LABELS[s.goal]}.`,
	shelfNoCoins: (_s) => 'The lollipop costs two coins.',
	shelfComplete: (s) => `That's ${GOAL_COST} of ${GOAL_COST} — your ${GOAL_LABELS[s.goal]}!`,
	lollipop: (_s) => 'Yummy! A lollipop just for you. Treats are okay! The rest goes in the jar.',
	lollipopGoal: (s) => `Yummy! A lollipop just for you. Treats are okay! ${goalStillText(s)}`,
	lollipopContinue: (_s) => 'The rest goes into the jar. Little bits of saving still add up!',

	// Jars ritual and the goal-state voice.
	jars: (s) => `Clink, clink! ${s.jarCoins} coins in the jar!`,
	whereGoalStands: goalStandsText,
	goalStillStands: goalStillText,

	// Goal reached and the next Goal.
	goalReached: (s) =>
		`You did it, ${buddyName(s)}! You saved six coins for your very own ${GOAL_LABELS[s.goal]}!`,
	goalPick: (_s) => 'What should we save for next?',

	// Tuck-in recap: the honest bookend.
	recapLine: (s) => {
		if (s.goalCompletedToday) {
			const done = s.homeItems.at(-1) ?? s.goal;
			return `You did it! The ${GOAL_LABELS[done]} is yours. Your ${GOAL_LABELS[s.goal]} needs ${GOAL_COST} coins — we can start tomorrow!`;
		}
		const earned = earnedToday(s);
		const earnedText = `${earned} coin${earned === 1 ? '' : 's'}`;
		if (s.jarCoins > 0) {
			const remaining = GOAL_COST - s.jarCoins;
			const more = remaining === 1 ? 'One more' : `${remaining} more`;
			return `Today you earned ${earnedText}. Your ${GOAL_LABELS[s.goal]} has ${s.jarCoins} of ${GOAL_COST} — ${more} and it's yours!`;
		}
		return `Today you earned ${earnedText}. Your ${GOAL_LABELS[s.goal]} has 0 of ${GOAL_COST}. Tomorrow we can earn more!`;
	},

	// Tuck-in.
	tuckInHappy: (s) => `Good night, Buddy. Good night, ${buddyName(s)}!`,
	tuckInSad: (s) =>
		`Buddy's tummy is still rumbling. We can feed Buddy tomorrow. Good night, ${buddyName(s)}!`
} satisfies Record<string, Line>;

import { GOAL_LABELS } from './economy';
import type { GameState } from './types';

/**
 * Every spoken line in the game lives here, name-interpolated with a warm
 * "friend" fallback when no name was given. Text on screen only ever
 * accompanies these lines — no reading required to play.
 */

export function buddyName(s: Pick<GameState, 'childName'>): string {
	const name = s.childName.trim();
	return name === '' ? 'friend' : name;
}

type Line = (s: GameState) => string;

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

	// Greeting.
	greeting: (s) => `Good morning, ${buddyName(s)}! Buddy is so happy to see you!`,
	greetingSad: (s) =>
		`Good morning, ${buddyName(s)}. Buddy's tummy is still a little rumbly. Can we feed Buddy today?`,

	// Helping Task: tidy the toys.
	tidy: (s) => `Look at the mess! Drag the toys into the box, ${buddyName(s)}.`,
	tidyPaid: (_s) => 'Two coins for a tidy room! Thank you for helping!',
	tidyNudge: (_s) => 'Drag the toy all the way into the box!',

	// Helping Task: water the tree.
	water: (_s) => 'Now the little tree is thirsty. Tap the water drops!',
	waterPaid: (_s) => 'One more coin! The tree is happy and green.',

	// Hunger — Buddy's need.
	hunger: (_s) => "Oh! Buddy's tummy is rumbling. Feed Buddy a snack?",
	hungerNoCoin: (_s) => 'Buddy needs one coin. Maybe we can help Buddy later.',

	// The Friend with the broken swing.
	friend: (_s) => "The bird's swing is broken. Give a coin to build a plank?",
	friendGive: (_s) => 'One plank! The bird is so happy!',
	friendDone: (s) => `You are a good friend, ${buddyName(s)}.`,
	friendNothing: (_s) => "That's okay. The bird is glad to see you.",

	// The Shelf: saving by default, the lollipop deliberately.
	shelf: (s) => `Time to choose! Coins in the jar for your ${GOAL_LABELS[s.goal]}, or a lollipop right now?`,
	shelfSave: (s) => `Clink! Saving for your ${GOAL_LABELS[s.goal]}.`,
	shelfNoCoins: (_s) => 'The lollipop costs two coins.',
	lollipop: (_s) => 'Yummy! A lollipop just for you. Treats are okay! The rest goes in the jar.',
	lollipopContinue: (_s) => 'The rest goes into the jar. Little bits of saving still add up!',

	// Jars ritual.
	jars: (s) => `Clink, clink! ${s.jarCoins} coins in the jar!`,

	// Goal reached and the next Goal.
	goalReached: (s) => `You did it, ${buddyName(s)}! You saved six coins for your very own ${GOAL_LABELS[s.goal]}!`,
	goalPick: (_s) => 'What should we save for next?',

	// Tuck-in.
	tuckInHappy: (s) => `Good night, Buddy. Good night, ${buddyName(s)}!`,
	tuckInSad: (s) =>
		`Buddy's tummy is still rumbling. We can feed Buddy tomorrow. Good night, ${buddyName(s)}!`
} satisfies Record<string, Line>;

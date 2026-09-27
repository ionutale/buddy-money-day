/**
 * Every number the game economy depends on.
 * Tests and scenes assert against these names, never raw numbers.
 */

/** Actions the Tidy chore asks for before it pays. */
export const TIDY_TOYS = 3;
/** Drops the Water chore asks for before it pays. */
export const WATER_DROPS = 3;

/** Coins paid when a chore's last action lands. Care is rewarded, never priced. */
export const TIDY_REWARD = 2;
export const WATER_REWARD = 1;
export const FEED_REWARD = 1;

/** The whole catalogue: small toys bought in the store, dreams saved in the jar. */
export const TOYS = ['ball', 'car', 'blocks', 'wagon', 'teddy'] as const;
export type ToyId = (typeof TOYS)[number];

export const TOY_PRICES: Record<ToyId, number> = {
	ball: 2,
	car: 4,
	blocks: 6,
	wagon: 12,
	teddy: 12
};

/** Toys are bought at the store; dreams are saved for and cycle forever. */
export const TOY_KIND: Record<ToyId, 'toy' | 'dream'> = {
	ball: 'toy',
	car: 'toy',
	blocks: 'toy',
	wagon: 'dream',
	teddy: 'dream'
};

/** Spoken and label forms of each toy. */
export const TOY_LABELS: Record<ToyId, string> = {
	ball: 'ball',
	car: 'car',
	blocks: 'blocks',
	wagon: 'wagon',
	teddy: 'big teddy'
};

/** The dream list, in saving order. Owned dreams are skipped; all owned means cycling. */
export const DREAMS = ['wagon', 'teddy'] as const;

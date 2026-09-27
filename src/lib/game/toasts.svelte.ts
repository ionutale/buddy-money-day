/**
 * Spoken lines also appear as a brief chip, so nothing in the game is
 * voice-only (muted voice, deaf parent, noisy room — the words stay).
 * One chip at a time: a newer line replaces the last.
 */

export type ToastItem = { id: number; text: string };

export const toasts = $state<{ items: ToastItem[] }>({ items: [] });

const VISIBLE_MS = 2400;
let nextId = 1;

export function toast(text: string): void {
	const id = nextId++;
	toasts.items = [{ id, text }];
	setTimeout(() => {
		toasts.items = toasts.items.filter((item) => item.id !== id);
	}, VISIBLE_MS);
}

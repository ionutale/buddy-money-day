/**
 * Coin flights: short hops from a spot in a scene to a spot in the HUD.
 * The schedule math is pure so it can be unit-tested; the store lives in
 * flights.svelte.ts. A flight's onDone is guaranteed by the fallback timer
 * even if a component unmounts mid-animation.
 */

export type Point = { x: number; y: number };

export type FlightSpec = {
	from: Point;
	to: Point;
	count?: number;
	onDone?: () => void;
};

export const FLIGHT_STAGGER_MS = 90;
export const FLIGHT_TAIL_MS = 600;

export function flightSchedule(count: number): { delays: number[]; fallbackMs: number } {
	const delays = Array.from({ length: Math.max(1, count) }, (_, index) => index * FLIGHT_STAGGER_MS);
	return { delays, fallbackMs: delays[delays.length - 1] + FLIGHT_TAIL_MS };
}

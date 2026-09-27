import { flightSchedule, type FlightSpec, type Point } from './flights';

export type ActiveFlight = {
	id: number;
	from: Point;
	to: Point;
	delays: number[];
};

/** Rendered by CoinFlights.svelte; never intercepts pointer events. */
export const flights = $state<{ active: ActiveFlight[] }>({ active: [] });

let nextId = 1;

export function flyCoins({ from, to, count = 1, onDone }: FlightSpec): void {
	const { delays, fallbackMs } = flightSchedule(count);
	const id = nextId++;
	flights.active = [...flights.active, { id, from, to, delays }];
	setTimeout(() => {
		flights.active = flights.active.filter((flight) => flight.id !== id);
		onDone?.();
	}, fallbackMs);
}

/** Where the HUD's coin counter lives right now — the landing spot for earns. */
export function hudCoinPoint(): Point {
	try {
		const el = document.querySelector('[data-testid="coin-count"]');
		const rect = el?.getBoundingClientRect();
		if (rect) return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
	} catch {
		/* fall through to the corner */
	}
	return { x: 40, y: 52 };
}

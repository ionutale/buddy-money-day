import { describe, expect, it } from 'vitest';
import { flightSchedule } from './flights';

describe('flightSchedule', () => {
	it('schedules a single coin', () => {
		expect(flightSchedule(1)).toEqual({ delays: [0], fallbackMs: 600 });
	});

	it('staggers three coins and names an end just past the last', () => {
		expect(flightSchedule(3)).toEqual({ delays: [0, 90, 180], fallbackMs: 780 });
	});

	it('never produces an empty schedule', () => {
		expect(flightSchedule(0).delays).toEqual([0]);
	});
});

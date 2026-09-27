/**
 * Tiny WebAudio effects: coin, clunk, pop, chime, sad. Every entry point is
 * guarded — unsupported browsers, blocked autoplay, and closed contexts all
 * stay silent. unlock() runs on the first tap so mobile browsers let sound
 * through. Nothing here ever throws.
 */

type AudioCtor = typeof AudioContext;

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
	if (typeof window === 'undefined') return null;
	try {
		const win = window as Window & { webkitAudioContext?: AudioCtor };
		const Ctor = window.AudioContext ?? win.webkitAudioContext;
		if (!Ctor) return null;
		ctx ??= new Ctor();
		if (ctx.state === 'suspended') void ctx.resume();
		return ctx;
	} catch {
		return null;
	}
}

/** Call on the first tap (the Start button) so the browser allows sounds. */
export function unlock(): void {
	audio();
}

type BlipOptions = {
	freq: number;
	duration?: number;
	type?: OscillatorType;
	volume?: number;
	delay?: number;
	/** If set, the tone slides to this frequency while it rings. */
	slideTo?: number;
};

function blip(options: BlipOptions): void {
	const ac = audio();
	if (!ac) return;
	try {
		const { freq, duration = 0.14, type = 'sine', volume = 0.16, delay = 0, slideTo } = options;
		const start = ac.currentTime + delay;
		const oscillator = ac.createOscillator();
		const gain = ac.createGain();
		oscillator.type = type;
		oscillator.frequency.setValueAtTime(freq, start);
		if (slideTo !== undefined) {
			oscillator.frequency.exponentialRampToValueAtTime(slideTo, start + duration);
		}
		gain.gain.setValueAtTime(0.0001, start);
		gain.gain.exponentialRampToValueAtTime(volume, start + 0.02);
		gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
		oscillator.connect(gain);
		gain.connect(ac.destination);
		oscillator.start(start);
		oscillator.stop(start + duration + 0.05);
	} catch {
		/* sound is a bonus, never a requirement */
	}
}

export const sounds = {
	/** Coins earn their clink. */
	coin(): void {
		blip({ freq: 880, duration: 0.12, type: 'triangle', volume: 0.18 });
		blip({ freq: 1318, duration: 0.22, type: 'triangle', volume: 0.14, delay: 0.07 });
	},
	/** A toy lands in the box. */
	clunk(): void {
		blip({ freq: 200, duration: 0.12, type: 'square', volume: 0.09, slideTo: 92 });
	},
	/** Something cute lands, pops, or blooms. */
	pop(): void {
		blip({ freq: 420, duration: 0.1, type: 'sine', volume: 0.2, slideTo: 880 });
	},
	/** A goal, a meal, a treat — small celebrations. */
	chime(): void {
		blip({ freq: 659, duration: 0.5, type: 'triangle', volume: 0.1 });
		blip({ freq: 880, duration: 0.5, type: 'triangle', volume: 0.1, delay: 0.12 });
		blip({ freq: 1109, duration: 0.6, type: 'triangle', volume: 0.1, delay: 0.24 });
	},
	/** A soft, low wobble — never a buzzer. */
	sad(): void {
		blip({ freq: 330, duration: 0.35, type: 'sine', volume: 0.12, slideTo: 208 });
	}
};

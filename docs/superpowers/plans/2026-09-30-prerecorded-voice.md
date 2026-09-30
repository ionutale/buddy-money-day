# Pre-recorded Buddy Voice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the game's Web Speech voice with bundled, pre-generated audio clips spoken in one designed voice.

**Architecture:** A pure TS catalogue (`spoken.ts`) defines, for every on-screen line, the name-less fragments Buddy says. A build step enumerates every reachable fragment, dedupes it, and emits `voice/lines.json` (for the generator) plus a generated `voice-map.ts` (text → clip id) for the runtime. A new `game_voice/` package in the Qwen3-TTS MLX studio renders each unique fragment to a mono MP3 through voice cloning against a single Library voice. At runtime `speech.ts` resolves fragments through the map and plays them in order with `<audio>`.

**Tech Stack:** SvelteKit 2 + Svelte 5 runes + TypeScript + Vitest (game); Playwright (e2e); Python 3.12 + MLX + soundfile/ffmpeg + pytest (studio); Qwen3-TTS 1.7B (VoiceDesign + VoiceClone, `8bit`).

**Spec:** `docs/superpowers/specs/2026-09-30-prerecorded-voice-design.md`

## Global Constraints

- Voice is **off by default**; `?mute=1` forces silence; every line stays on screen as text.
- **The child's name never appears in any audio fragment** (arbitrary input cannot be pre-rendered).
- The app stays a **static SPA** — same-origin assets only, no backend, no third-party calls.
- Clip ids are `sha1(text)[:10]`; files are `static/voice/<id>.mp3`; the runtime map is text → id.
- Audio format: **mono MP3, 96 kbps, loudnorm `I=-16`**, leading/trailing silence trimmed.
- `spoken` must satisfy `Record<keyof typeof lines, (s: GameState) => string[]>` (compile-time parity) plus `storeCompare`.
- `Settings` becomes `{ voiceEnabled: boolean }`; a stored `voiceURI` is ignored, never a reset.
- Studio generation uses model size `1.7B`, quantization `8bit` and Library voice `buddy`.
- All package commands use `pnpm`; all Python commands use the studio `.venv`.

## Review Focus

1. **Pre-gesture autoplay** — the first line (Grown-up Setup) fires before any user tap on phones; a blocked `play()` must not throw and must not stall the rest of the game. (Task 6.)
2. **Missing fragment** — a spoken text with no `voiceMap` entry (catalogue drift) must be skipped silently; the game must keep playing. (Task 6.)
3. **Muted while voice is on** — with `?mute=1` and `voiceEnabled: true`, zero `/voice/*.mp3` requests may be made. (Tasks 6 and 7.)
4. **Legacy settings** — a stored `{"voiceEnabled":true,"voiceURI":"voice-bella"}` must load as `{ voiceEnabled: true }` without resetting or throwing. (Task 6.)
5. **Rapid scene changes** — two `speakFragments` calls in quick succession must stop the first line, never overlap it. (Task 6.)

---

## File Structure

**Game repo (`/Users/ionutale/games-development/financial-game-4-years-old`)**

| File | Responsibility |
|---|---|
| `src/lib/game/spoken.ts` | The spoken fragments for every line (name omitted). Single source of truth for audio. |
| `src/lib/game/voiceCatalogue.ts` | Pure enumeration of every reachable fragment (testable, no I/O). |
| `scripts/build-voice-lines.ts` | Writes `voice/lines.json` + `src/lib/game/voice-map.ts` from the catalogue. |
| `voice/lines.json` | Generated: `[{ id, text }]`, the generator's input. |
| `src/lib/game/voice-map.ts` | Generated: `Record<text, id>` for the runtime. |
| `src/lib/game/speech.ts` | The `<audio>` player: `speakFragments`, `cancelSpeech`. |
| `src/lib/game/settings.ts` / `settings.svelte.ts` | `{ voiceEnabled }` only. |
| `src/lib/components/*.svelte` | Call sites + the trimmed Grown-up Setup. |
| `static/voice/*.mp3` + `manifest.json` | The generated clips. |
| `e2e/settings.spec.ts`, `e2e/voice.spec.ts` | Voice UI + audio-request e2e. |

**Studio repo (`/Users/ionutale/developer-playground/qwen3-tts-mlx-studio`)**

| File | Responsibility |
|---|---|
| `game_voice/design_voice.py` | Generate VoiceDesign takes; save the chosen take to the Library. |
| `game_voice/generate_lines.py` | Render `voice/lines.json` fragments to MP3 via VoiceClone. |
| `game_voice/test_design_voice.py` / `test_generate_lines.py` | Faked-engine unit tests. |
| `game_voice/README.md` | How to run the pipeline. |

**Task order keeps the tree green:** Tasks 1–5 are additive (new files, then assets). Task 6 is the single cutover commit that retires Web Speech. Tasks 7–8 are tests and docs.

---

## Task 1: The spoken catalogue

**Files:**
- Modify: `src/lib/game/lines.ts` (export `moreChores`)
- Create: `src/lib/game/spoken.ts`
- Test: `src/lib/game/spoken.spec.ts`

**Interfaces:**
- Consumes: `lines` (`keyof typeof lines`), `moreChores`, `economy.ts` (`TOY_LABELS`, `TOY_PRICES`), `GameState`.
- Produces: `spoken` (below), `TOGGLE_ON: string`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/game/spoken.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { lines } from './lines';
import { newGame } from './state';
import { spoken, TOGGLE_ON } from './spoken';
import type { GameState } from './types';

function s(patch: Partial<GameState> = {}): GameState {
	return { ...newGame(), ...patch };
}

describe('the spoken catalogue', () => {
	it('covers every line in lines.ts with a non-empty fragment list', () => {
		for (const key of Object.keys(lines) as (keyof typeof lines)[]) {
			expect(spoken[key], key).toBeTypeOf('function');
			const fragments = spoken[key](s());
			expect(Array.isArray(fragments), key).toBe(true);
			expect(fragments.length, key).toBeGreaterThan(0);
			for (const fragment of fragments) expect(fragment.length).toBeGreaterThan(0);
		}
	});

	it('never speaks the child name', () => {
		const named = s({ childName: 'Sam' });
		const texts = [
			...spoken.setup(named),
			...spoken.start(named),
			...spoken.greetingPlan(named),
			...spoken.dreamReached(named),
			...spoken.recapLine(named)
		];
		for (const text of texts) expect(text).not.toContain('Sam');
	});

	it('keeps the on-screen meaning while dropping the name', () => {
		expect(spoken.start(s({ childName: 'Sam' }))).toEqual([
			'Hi! Buddy is ready for a Money Day.'
		]);
		expect(spoken.greetingPlan(s())).toEqual([
			'Good morning!',
			'Today we can earn 4 coins for your wagon!'
		]);
	});

	it('splits the combinatorial lines into dedupable fragments', () => {
		expect(spoken.dreamStands(s({ jarCoins: 7 }))).toEqual(['Your wagon has 7 of 12.']);
		expect(spoken.recapLine(s({ earnedTodayCoins: 4, jarCoins: 4 }))).toEqual([
			'Today you earned 4 coins.',
			'Your wagon has 4 of 12.',
			'8 more chores tomorrow!'
		]);
		expect(spoken.storeCompare('ball', s({ coins: 0 }))).toEqual([
			"That's 2 coins — you have 0.",
			'Two more chores tomorrow!'
		]);
	});

	it('celebrates a completed dream in the recap', () => {
		expect(
			spoken.recapLine(s({ goal: 'teddy', dreamCompletedToday: true, owned: ['wagon'] }))
		).toEqual([
			'You did it!',
			'The wagon is yours.',
			'Your big teddy needs 12 coins — we can start tomorrow!'
		]);
	});

	it('exposes the toggle line', () => {
		expect(TOGGLE_ON).toBe('Voice on!');
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run src/lib/game/spoken.spec.ts`
Expected: FAIL — `Failed to resolve import "./spoken"`.

- [ ] **Step 3: Export `moreChores` from `lines.ts`**

In `src/lib/game/lines.ts`, change the declaration to export it (no other change):

```ts
/** "5 more chores tomorrow!" — honest arithmetic, never a scold. */
export function moreChores(n: number): string {
```

- [ ] **Step 4: Write `src/lib/game/spoken.ts`**

```ts
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

	start: () => ['Hi! Buddy is ready for a Money Day.'],

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
```

- [ ] **Step 5: Run the tests and `svelte-check`**

Run: `pnpm exec vitest run src/lib/game/spoken.spec.ts && pnpm check`
Expected: PASS for the spec; `pnpm check` reports 0 errors (the `satisfies` clause proves every `lines` key exists).

- [ ] **Step 6: Commit**

```bash
git add src/lib/game/lines.ts src/lib/game/spoken.ts src/lib/game/spoken.spec.ts
git commit -m "feat: spoken fragment catalogue for pre-recorded voice"
```

---

## Task 2: Enumerate fragments into committed artifacts

**Files:**
- Create: `src/lib/game/voiceCatalogue.ts`, `scripts/build-voice-lines.ts`, `src/lib/game/voiceMap.spec.ts`, `voice/lines.json`, `src/lib/game/voice-map.ts`
- Modify: `package.json`, `pnpm-lock.yaml`

**Interfaces:**
- Consumes: `spoken`, `TOGGLE_ON` (Task 1); `newGame`; `DREAMS`, `TOYS`.
- Produces: `collectFragments(): string[]`; `voiceMap: Record<string,string>`; `voice/lines.json`.

- [ ] **Step 1: Add the TS script runner**

Run: `pnpm add -D tsx`
Then add to `package.json` `"scripts"`:

```json
"voice:lines": "tsx scripts/build-voice-lines.ts"
```

- [ ] **Step 2: Write the pure catalogue enumerator**

Create `src/lib/game/voiceCatalogue.ts`:

```ts
import { DREAMS, TOYS } from './economy';
import { spoken, TOGGLE_ON } from './spoken';
import { newGame } from './state';
import type { GameState } from './types';

/**
 * Every fragment the game can ever say, deduplicated. Pure: the build script
 * writes these to disk; the drift test compares them to the committed map.
 */

const MAX_JAR = 12;
const MAX_EARNED = 4;
const MAX_HAND = 12;

function s(patch: Partial<GameState> = {}): GameState {
	return { ...newGame(), ...patch };
}

export function collectFragments(): string[] {
	const texts = new Set<string>();
	const add = (fragments: string[]) => fragments.forEach((f) => texts.add(f));

	// Name-free lines: one call each, in both setup variants.
	add(spoken.setup(s({ childName: '', nameSkipped: true })));
	add(spoken.setup(s({ childName: 'Sam' })));
	add(spoken.voiceSample(s()));
	add(spoken.start(s()));
	add(spoken.tidy(s()));
	add(spoken.tidyPaid(s()));
	add(spoken.tidyNudge(s()));
	add(spoken.water(s()));
	add(spoken.waterPaid(s()));
	add(spoken.feed(s()));
	add(spoken.feedPaid(s()));
	add(spoken.cap(s()));
	add(spoken.storeBought(s()));
	add(spoken.storeOwned(s()));
	add(spoken.toysEmpty(s()));
	add([TOGGLE_ON]);

	for (const goal of DREAMS) {
		add(spoken.planLine(s({ goal })));
		add(spoken.greetingPlan(s({ goal })));
		add(spoken.store(s({ goal })));
		add(spoken.storeSave(s({ goal })));
		add(spoken.dreamReached(s({ goal })));
		for (let jar = 0; jar <= MAX_JAR; jar++) {
			add(spoken.dreamStands(s({ goal, jarCoins: jar })));
		}
		for (let earned = 0; earned <= MAX_EARNED; earned++) {
			for (let jar = 0; jar <= MAX_JAR; jar++) {
				add(spoken.recapLine(s({ goal, jarCoins: jar, earnedTodayCoins: earned })));
			}
		}
		add(spoken.recapLine(s({
			goal,
			dreamCompletedToday: true,
			owned: [DREAMS.find((d) => d !== goal) ?? goal]
		})));
	}

	for (const toy of TOYS) {
		for (let coins = 0; coins <= MAX_HAND; coins++) {
			add(spoken.storeCompare(toy, s({ coins })));
		}
	}

	return [...texts].sort();
}
```

- [ ] **Step 3: Write the build script**

Create `scripts/build-voice-lines.ts`:

```ts
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectFragments } from '../src/lib/game/voiceCatalogue';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const texts = collectFragments();

const entries = texts.map((text) => ({
	id: createHash('sha1').update(text, 'utf8').digest('hex').slice(0, 10),
	text
}));

const byId = new Map<string, string>();
for (const { id, text } of entries) {
	const clash = byId.get(id);
	if (clash !== undefined && clash !== text) {
		throw new Error(`clip id collision ${id}: ${JSON.stringify(clash)} vs ${JSON.stringify(text)}`);
	}
	byId.set(id, text);
}

mkdirSync(resolve(root, 'voice'), { recursive: true });
writeFileSync(resolve(root, 'voice/lines.json'), JSON.stringify(entries, null, 2) + '\n');

const body = entries
	.map(({ id, text }) => `\t${JSON.stringify(text)}: ${JSON.stringify(id)}`)
	.join(',\n');
writeFileSync(
	resolve(root, 'src/lib/game/voice-map.ts'),
	`// AUTO-GENERATED by \`pnpm voice:lines\`. Do not edit by hand.\n` +
		`// Regenerate after changing spoken.ts or voiceCatalogue.ts.\n` +
		`export const voiceMap: Record<string, string> = {\n${body}\n};\n`
);

console.log(`voice:lines — ${entries.length} fragments → voice/lines.json, voice-map.ts`);
```

- [ ] **Step 4: Write the drift test**

Create `src/lib/game/voiceMap.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { collectFragments } from './voiceCatalogue';
import { voiceMap } from './voice-map';

describe('the generated voice map', () => {
	it('maps every reachable fragment to a clip id', () => {
		for (const text of collectFragments()) {
			expect(voiceMap[text], text).toMatch(/^[0-9a-f]{10}$/);
		}
	});

	it('has no entries the catalogue cannot produce', () => {
		const reachable = new Set(collectFragments());
		for (const text of Object.keys(voiceMap)) {
			expect(reachable.has(text), text).toBe(true);
		}
	});

	it('assigns each text a unique id', () => {
		const ids = Object.values(voiceMap);
		expect(new Set(ids).size).toBe(ids.length);
	});
});
```

- [ ] **Step 5: Generate the artifacts**

Run: `pnpm voice:lines`
Expected: `voice:lines — N fragments → voice/lines.json, voice-map.ts` with N in the ~90–110 range.

- [ ] **Step 6: Run the drift test**

Run: `pnpm exec vitest run src/lib/game/voiceMap.spec.ts`
Expected: PASS (3 tests).

- [ ] **Step 7: Commit**

```bash
git add package.json pnpm-lock.yaml scripts/build-voice-lines.ts \
  src/lib/game/voiceCatalogue.ts src/lib/game/voice-map.ts \
  src/lib/game/voiceMap.spec.ts voice/lines.json
git commit -m "feat: enumerate spoken fragments into a voice map"
```

---

## Task 3: Design the voice in the studio

**Files (studio):**
- Create: `game_voice/design_voice.py`, `game_voice/test_design_voice.py`

**Interfaces:**
- Consumes: `engine.TTSEngine`, `voice_library.VoiceLibrary`.
- Produces: `slugify(text)`, `resolve_engine(model_size, quant)`, `audition(engine, description, text, takes, outdir, *, language, log) -> list[Path]`, `save_to_library(library, name, wav_path, transcript, language, description) -> str`, `main(argv) -> int`.

- [ ] **Step 1: Write the failing test**

Create (studio) `game_voice/test_design_voice.py`:

```python
"""Unit tests for the voice-design step (engine faked — no models, no audio).

Run: .venv/bin/python -m pytest game_voice -q
"""
import sys
from pathlib import Path

import numpy as np
import pytest
import soundfile as sf

sys.path.insert(0, str(Path(__file__).resolve().parent))

import design_voice  # noqa: E402
from design_voice import audition, save_to_library, slugify  # noqa: E402


class FakeDesignEngine:
    def __init__(self, sr=24000):
        self.sr = sr
        self.calls = []

    def generate_voice_design(self, text, language, instruct, **kwargs):
        self.calls.append({"text": text, "language": language, "instruct": instruct})
        return self.sr, np.full(int(self.sr * 0.1), 0.2, dtype=np.float32)


class FakeLibrary:
    def __init__(self):
        self.saved = None

    def save_voice(self, name, ref_audio_path, ref_text, language, description="", source="clone"):
        self.saved = {
            "name": name,
            "ref_audio_path": ref_audio_path,
            "ref_text": ref_text,
            "language": language,
            "description": description,
            "source": source,
        }
        return f"/voices/{name}"


class TestSlugify:
    def test_lowercases_and_dashes(self):
        assert slugify("Warm Storyteller!") == "warm-storyteller"

    def test_empty_falls_back(self):
        assert slugify("   ") == "voice"


class TestAudition:
    def test_writes_one_wav_per_take(self, tmp_path):
        engine = FakeDesignEngine()
        paths = audition(engine, "warm and gentle", "Hello there!", takes=3,
                         outdir=tmp_path, language="English")
        assert [p.name for p in paths] == ["take-1.wav", "take-2.wav", "take-3.wav"]
        assert all(p.exists() and p.stat().st_size > 0 for p in paths)
        assert len(engine.calls) == 3
        assert engine.calls[0]["instruct"] == "warm and gentle"


class TestSaveToLibrary:
    def test_copies_and_records_source(self, tmp_path):
        wav = tmp_path / "take-1.wav"
        sf.write(str(wav), np.zeros(2400, np.float32), 24000, subtype="PCM_16")
        library = FakeLibrary()
        result = save_to_library(library, "buddy", wav, "Hello there!", "English",
                                 "warm and gentle")
        assert result == "/voices/buddy"
        assert library.saved["source"] == "design"
        assert library.saved["ref_text"] == "Hello there!"
        assert library.saved["description"] == "warm and gentle"

    def test_missing_take_raises(self, tmp_path):
        library = FakeLibrary()
        with pytest.raises(FileNotFoundError):
            save_to_library(library, "buddy", tmp_path / "gone.wav", "x", "English", "d")
```

- [ ] **Step 2: Run it to verify it fails**

Run (studio root): `.venv/bin/python -m pytest game_voice/test_design_voice.py -q`
Expected: FAIL — `No module named 'design_voice'`.

- [ ] **Step 3: Write (studio) `game_voice/design_voice.py`**

```python
"""Design Buddy's voice once, audition takes, and save the chosen one.

A designed voice is not reproducible from its description — the studio stores
the chosen take as a cloned reference. This step produces takes and saves one
to the Library; every game line is then rendered against it.

Run: .venv/bin/python game_voice/design_voice.py --help
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

import soundfile as sf

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from voice_library import VoiceLibrary  # noqa: E402

DEFAULT_DESCRIPTION = (
    "A warm, gentle female storyteller with a soft, clear voice, speaking slowly "
    "and kindly like a preschool teacher reading to a small child — light "
    "encouragement, clean articulation."
)

# Long enough for a stable clone reference (target 5-10 s).
DEFAULT_TEXT = (
    "Good morning! Today we can earn four coins for your wagon! "
    "I'm hungry! Feed me and I'll pay you a coin!"
)

__all__ = ["slugify", "resolve_engine", "audition", "save_to_library", "main"]


def slugify(text: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return slug or "voice"


def resolve_engine(model_size: str = "1.7B", quantization: str = "8bit"):
    """Import and configure the studio engine (heavy: MLX, kept lazy)."""
    from engine import TTSEngine  # noqa: PLC0415

    engine = TTSEngine()
    engine.model_size = model_size
    engine.quantization = quantization
    return engine


def audition(engine, description: str, text: str, takes: int, outdir, *,
             language: str = "English", log=print) -> list[Path]:
    """Generate `takes` candidate WAVs into outdir; returns their paths."""
    outdir = Path(outdir)
    outdir.mkdir(parents=True, exist_ok=True)
    paths: list[Path] = []
    for index in range(1, takes + 1):
        sample_rate, audio = engine.generate_voice_design(
            text, language=language, instruct=description)
        path = outdir / f"take-{index}.wav"
        sf.write(str(path), audio, sample_rate, subtype="PCM_16")
        paths.append(path)
        log(f"[design] take {index}/{takes} → {path}")
    return paths


def save_to_library(library, name: str, wav_path, transcript: str,
                    language: str, description: str) -> str:
    """Save a take as a Library voice (source='design')."""
    wav_path = Path(wav_path)
    if not wav_path.is_file():
        raise FileNotFoundError(f"take not found: {wav_path}")
    return library.save_voice(
        name=name, ref_audio_path=str(wav_path), ref_text=transcript,
        language=language, description=description, source="design")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="design_voice",
        description="Audition a designed voice, or save a chosen take to the Library.")
    parser.add_argument("--description", default=DEFAULT_DESCRIPTION)
    parser.add_argument("--text", default=DEFAULT_TEXT,
                        help="spoken sample; its transcript is stored with the voice")
    parser.add_argument("--takes", type=int, default=3)
    parser.add_argument("--outdir", default=str(REPO_ROOT / "outputs" / "auditions" / "buddy"))
    parser.add_argument("--save-as", help="save a take to the Library under this name")
    parser.add_argument("--from", dest="source", help="take WAV to save (with --save-as)")
    parser.add_argument("--language", default="English")
    parser.add_argument("--voices-dir", default=str(REPO_ROOT / "voices"))
    parser.add_argument("--model-size", default="1.7B", choices=["0.6B", "1.7B"])
    parser.add_argument("--quant", default="8bit", choices=["4bit", "6bit", "8bit", "bf16"])
    return parser


def main(argv=None) -> int:
    args = build_parser().parse_args(argv)
    library = VoiceLibrary(args.voices_dir)

    if args.save_as:
        if not args.source:
            print("[design] --save-as needs --from <take.wav>")
            return 1
        result = save_to_library(library, args.save_as, args.source, args.text,
                                 args.language, args.description)
        print(f"[design] saved voice '{args.save_as}' → {result}")
        return 0

    engine = resolve_engine(args.model_size, args.quant)
    paths = audition(engine, args.description, args.text, args.takes,
                     args.outdir, language=args.language)
    print(f"[design] auditions in {args.outdir}")
    print(f"[design] pick one, then: --save-as buddy --from {paths[0]}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
```

- [ ] **Step 4: Run the test to verify it passes**

Run (studio root): `.venv/bin/python -m pytest game_voice/test_design_voice.py -q`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit** (studio repo)

```bash
git -C /Users/ionutale/developer-playground/qwen3-tts-mlx-studio add game_voice/design_voice.py game_voice/test_design_voice.py
git -C /Users/ionutale/developer-playground/qwen3-tts-mlx-studio commit -m "feat(game_voice): design and save Buddy's voice"
```

---

## Task 4: Render the game lines

**Files (studio):**
- Create: `game_voice/generate_lines.py`, `game_voice/test_generate_lines.py`, `game_voice/README.md`

**Interfaces:**
- Consumes: `engine.TTSEngine`, `audio_utils.export_audio`/`check_ffmpeg`.
- Produces: `load_lines(path) -> list[dict]`, `resolve_voice(name, voices_dir) -> dict`, `clip_path(out_dir, clip_id) -> Path`, `render_lines(engine, entries, out_dir, voice, *, fmt, bitrate, batch_size, retries, log) -> list[Path]`, `build_manifest(entries, out_dir, duration_fn=None) -> list[dict]`, `load_engine(model_size, quant)`, `media_duration(path)`, `main(argv) -> int`.

- [ ] **Step 1: Write the failing test**

Create (studio) `game_voice/test_generate_lines.py`:

```python
"""Unit tests for the line renderer (engine faked — no models, no ffmpeg).

Run: .venv/bin/python -m pytest game_voice -q
"""
import json
import sys
from pathlib import Path

import numpy as np
import pytest
import soundfile as sf

sys.path.insert(0, str(Path(__file__).resolve().parent))

import generate_lines  # noqa: E402
from generate_lines import (  # noqa: E402
    build_manifest,
    clip_path,
    load_lines,
    render_lines,
    resolve_voice,
)


class FakeCloneEngine:
    def __init__(self, fail_batch_times=0, sr=24000):
        self.sr = sr
        self.batch_calls = 0
        self.single_calls = 0
        self.texts = []
        self.fail_batch_times = fail_batch_times

    def _audio(self):
        return np.full(int(self.sr * 0.05), 0.1, dtype=np.float32)

    def batch_generate_voice_clone(self, texts, ref_audio_path, ref_text,
                                   language="English", **kwargs):
        self.batch_calls += 1
        self.texts.extend(texts)
        if self.batch_calls <= self.fail_batch_times:
            raise RuntimeError("batch boom")
        return [(self.sr, self._audio()) for _ in texts]

    def generate_voice_clone(self, text, ref_audio_path, ref_text,
                             language="English", **kwargs):
        self.single_calls += 1
        self.texts.append(text)
        return self.sr, self._audio()


def _voice(tmp_path):
    ref = tmp_path / "reference.wav"
    sf.write(str(ref), np.zeros(2400, np.float32), 24000, subtype="PCM_16")
    return {"ref_audio": str(ref), "ref_text": "hello there", "language": "English"}


def _entries(tmp_path, n=3):
    path = tmp_path / "lines.json"
    path.write_text(json.dumps([
        {"id": f"id{i}", "text": f"line number {i}"} for i in range(n)
    ]), encoding="utf-8")
    return load_lines(path)


class TestLoadLines:
    def test_reads_id_and_text(self, tmp_path):
        assert _entries(tmp_path)[0] == {"id": "id0", "text": "line number 0"}


class TestResolveVoice:
    def test_library_voice(self, tmp_path):
        voice_dir = tmp_path / "buddy"
        voice_dir.mkdir()
        sf.write(str(voice_dir / "reference.wav"), np.zeros(2400, np.float32),
                 24000, subtype="PCM_16")
        (voice_dir / "profile.json").write_text(json.dumps({
            "name": "buddy", "ref_text": "hi there", "ref_audio": "reference.wav",
            "language": "Auto-detect",
        }), encoding="utf-8")
        voice = resolve_voice("buddy", tmp_path)
        assert voice["ref_text"] == "hi there"
        assert voice["language"] == "auto"  # normalized for the engine
        assert voice["ref_audio"].endswith("reference.wav")

    def test_missing_voice_raises(self, tmp_path):
        with pytest.raises(ValueError, match="not found"):
            resolve_voice("nope", tmp_path)


@pytest.mark.skipif(
    not generate_lines.check_ffmpeg(), reason="ffmpeg required for mp3 output")
class TestRenderLines:
    def test_writes_one_mp3_per_line(self, tmp_path):
        engine = FakeCloneEngine()
        paths = render_lines(engine, _entries(tmp_path), tmp_path / "voice",
                             _voice(tmp_path), fmt="mp3", bitrate=96, retries=0,
                             log=lambda *_: None)
        assert [p.name for p in paths] == ["id0.mp3", "id1.mp3", "id2.mp3"]
        assert all(p.exists() and p.stat().st_size > 0 for p in paths)
        assert engine.single_calls == 0  # one batch of 3
        assert engine.batch_calls == 1

    def test_resume_skips_existing_clips(self, tmp_path):
        out = tmp_path / "voice"
        out.mkdir()
        clip_path(out, "id1").with_suffix(".mp3").write_bytes(b"already here")
        engine = FakeCloneEngine()
        render_lines(engine, _entries(tmp_path), out, _voice(tmp_path),
                     fmt="mp3", bitrate=96, retries=0, log=lambda *_: None)
        assert set(engine.texts) == {"line number 0", "line number 2"}

    def test_batch_failure_falls_back_to_singles(self, tmp_path):
        engine = FakeCloneEngine(fail_batch_times=99)
        render_lines(engine, _entries(tmp_path), tmp_path / "voice", _voice(tmp_path),
                     fmt="mp3", bitrate=96, retries=0, log=lambda *_: None)
        assert engine.batch_calls == 1
        assert engine.single_calls == 3


class TestBuildManifest:
    def test_records_size_and_hash(self, tmp_path):
        out = tmp_path / "voice"
        out.mkdir()
        (out / "id0.mp3").write_bytes(b"abc")
        (out / "id1.mp3").write_bytes(b"de")
        rows = build_manifest([{"id": "id0", "text": "a"}, {"id": "id1", "text": "b"}], out)
        assert rows[0]["bytes"] == 3
        assert rows[0]["duration"] == 0.0  # no ffprobe supplied
        assert rows[0]["text"] == "a"
        assert len(rows[0]["sha256"]) == 64

    def test_missing_clip_is_marked(self, tmp_path):
        rows = build_manifest([{"id": "gone", "text": "x"}], tmp_path)
        assert rows[0]["bytes"] == 0
```

- [ ] **Step 2: Run it to verify it fails**

Run (studio root): `.venv/bin/python -m pytest game_voice/test_generate_lines.py -q`
Expected: FAIL — `No module named 'generate_lines'`.

- [ ] **Step 3: Write (studio) `game_voice/generate_lines.py`**

```python
"""Render the game's spoken fragments to MP3 with a cloned Library voice.

Reads the game's `voice/lines.json` ([{id, text}]), synthesizes every unique
fragment that is not already on disk, and writes `<out>/<id>.mp3` plus a
manifest. Resumable: re-running fills only the missing clips.

Run: .venv/bin/python game_voice/generate_lines.py --help
"""
from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import sys
import time
from pathlib import Path

import numpy as np

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from audio_utils import check_ffmpeg, export_audio  # noqa: E402

EXT = {"mp3": ".mp3", "wav": ".wav", "ogg": ".ogg"}

__all__ = [
    "load_lines", "resolve_voice", "clip_path", "render_lines",
    "build_manifest", "load_engine", "media_duration", "main",
]


def load_lines(path) -> list[dict]:
    """Read the game's emitted fragment list."""
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    return [{"id": str(item["id"]), "text": str(item["text"])} for item in data]


def _normalize_language(language: str) -> str:
    return "auto" if language == "Auto-detect" else language


def resolve_voice(name: str, voices_dir) -> dict:
    """Build the clone voice config from a saved Library voice."""
    voice_dir = Path(voices_dir) / name
    profile_path = voice_dir / "profile.json"
    if not profile_path.is_file():
        raise ValueError(f"voice '{name}' not found in {voices_dir}")
    profile = json.loads(profile_path.read_text(encoding="utf-8"))
    ref = voice_dir / profile.get("ref_audio", "reference.wav")
    if not ref.is_file():
        raise ValueError(f"voice '{name}' reference audio not found: {ref}")
    return {
        "ref_audio": str(ref),
        "ref_text": profile.get("ref_text", ""),
        "language": _normalize_language(profile.get("language") or "English"),
    }


def clip_path(out_dir, clip_id: str) -> Path:
    return Path(out_dir) / clip_id


def _complete(path: Path) -> bool:
    return path.is_file() and path.stat().st_size > 0


def _render_batch(engine, texts, voice) -> dict[str, tuple]:
    results = engine.batch_generate_voice_clone(
        texts, voice["ref_audio"], voice["ref_text"], language=voice["language"])
    return {text: (sr, audio) for text, (sr, audio) in zip(texts, results)}


def _render_one(engine, text, voice):
    return engine.generate_voice_clone(
        text, voice["ref_audio"], voice["ref_text"], language=voice["language"])


def render_lines(engine, entries, out_dir, voice, *, fmt="mp3", bitrate=96,
                 batch_size=4, retries=2, log=print) -> list[Path]:
    """Synthesize every missing clip; returns paths for all entries, in order."""
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    ext = EXT.get(fmt, ".wav")
    pending = [e for e in entries if not _complete(clip_path(out_dir, e["id"]).with_suffix(ext))]
    log(f"[lines] {len(entries)} clips total, {len(pending)} to render")

    for start in range(0, len(pending), batch_size):
        group = pending[start:start + batch_size]
        audio_by_text: dict[str, tuple] = {}
        for attempt in range(retries + 1):
            try:
                audio_by_text.update(_render_batch(engine, [e["text"] for e in group], voice))
                break
            except Exception as exc:  # noqa: BLE001 — engine errors are opaque
                log(f"[lines] batch attempt {attempt + 1}/{retries + 1} failed: {exc}")
        else:
            for entry in group:  # batch kept failing — one clip at a time
                audio_by_text[entry["text"]] = _render_one(engine, entry["text"], voice)
        for entry in group:
            sample_rate, audio = audio_by_text[entry["text"]]
            export_audio(audio=np.asarray(audio, dtype=np.float32), sr=sample_rate,
                         output_path=str(clip_path(out_dir, entry["id"])), fmt=fmt,
                         mp3_bitrate=bitrate, loudnorm=True, trim_silence=True)
        log(f"[lines] {min(start + batch_size, len(pending))}/{len(pending)} rendered")

    return [clip_path(out_dir, e["id"]).with_suffix(ext) for e in entries]


def build_manifest(entries, out_dir, duration_fn=None) -> list[dict]:
    """Describe each clip: text, bytes, sha256, and duration when available."""
    out_dir = Path(out_dir)
    rows = []
    for entry in entries:
        path = clip_path(out_dir, entry["id"]).with_suffix(".mp3")
        if path.is_file():
            payload = path.read_bytes()
            rows.append({
                "id": entry["id"],
                "text": entry["text"],
                "bytes": len(payload),
                "duration": float(duration_fn(path)) if duration_fn else 0.0,
                "sha256": hashlib.sha256(payload).hexdigest(),
            })
        else:
            rows.append({"id": entry["id"], "text": entry["text"],
                         "bytes": 0, "duration": 0.0, "sha256": ""})
    return rows


def load_engine(model_size: str = "1.7B", quantization: str = "8bit"):
    """Import and configure the studio engine (heavy: MLX, kept lazy)."""
    from engine import TTSEngine  # noqa: PLC0415

    engine = TTSEngine()
    engine.model_size = model_size
    engine.quantization = quantization
    return engine


def media_duration(path) -> float:
    """Duration in seconds, via ffprobe."""
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", str(path)],
        capture_output=True, text=True, check=True)
    return float(result.stdout.strip())


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="generate_lines",
        description="Render voice/lines.json to static/voice/*.mp3 with a cloned voice.")
    parser.add_argument("--lines", required=True, help="path to voice/lines.json")
    parser.add_argument("--voice", required=True, help="Library voice name (e.g. buddy)")
    parser.add_argument("--out", required=True, help="output dir (e.g. <game>/static/voice)")
    parser.add_argument("--voices-dir", default=str(REPO_ROOT / "voices"))
    parser.add_argument("--format", default="mp3", choices=["mp3", "wav", "ogg"])
    parser.add_argument("--bitrate", type=int, default=96, help="MP3 bitrate kbps")
    parser.add_argument("--batch-size", type=int, default=4)
    parser.add_argument("--retries", type=int, default=2)
    parser.add_argument("--model-size", default="1.7B", choices=["0.6B", "1.7B"])
    parser.add_argument("--quant", default="8bit", choices=["4bit", "6bit", "8bit", "bf16"])
    return parser


def main(argv=None) -> int:
    args = build_parser().parse_args(argv)
    if args.format == "mp3" and not check_ffmpeg():
        print("[lines] ERROR: ffmpeg is required for MP3 output (brew install ffmpeg)")
        return 1

    entries = load_lines(args.lines)
    if not entries:
        print("[lines] ERROR: no fragments in", args.lines)
        return 1
    voice = resolve_voice(args.voice, args.voices_dir)
    engine = load_engine(args.model_size, args.quant)

    started = time.monotonic()
    render_lines(engine, entries, args.out, voice, fmt=args.format,
                 bitrate=args.bitrate, batch_size=args.batch_size,
                 retries=args.retries)
    rows = build_manifest(entries, args.out, duration_fn=media_duration)
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "manifest.json").write_text(json.dumps(rows, indent=2) + "\n",
                                           encoding="utf-8")

    total_bytes = sum(r["bytes"] for r in rows)
    total_seconds = sum(r["duration"] for r in rows)
    print(f"[lines] {len(rows)} clips, {total_bytes / 1e6:.1f} MB, "
          f"{total_seconds / 60:.1f} min in {time.monotonic() - started:.0f}s")
    print(f"[lines] output: {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
```

- [ ] **Step 4: Run the tests to verify they pass**

Run (studio root): `.venv/bin/python -m pytest game_voice -q`
Expected: PASS (all design + generate tests, including the ffmpeg-gated renderer tests on this Mac).

- [ ] **Step 5: Document the pipeline**

Create (studio) `game_voice/README.md`:

````markdown
# Game voice pack

Renders a SvelteKit game's spoken lines to a folder of MP3 clips.

## 1. Design the voice (once)

```bash
.venv/bin/python game_voice/design_voice.py --takes 3 --outdir outputs/auditions/buddy
# listen, pick a take, then:
.venv/bin/python game_voice/design_voice.py \
    --save-as buddy --from outputs/auditions/buddy/take-2.wav
```

## 2. Render the lines

```bash
.venv/bin/python game_voice/generate_lines.py \
    --lines <game>/voice/lines.json --voice buddy \
    --out <game>/static/voice --format mp3 --bitrate 96
```

Resumable: re-run to fill only missing clips. Writes `<out>/manifest.json`.

## Tests

```bash
.venv/bin/python -m pytest game_voice -q   # faked engine, no models
```
````

- [ ] **Step 6: Commit** (studio repo)

```bash
git -C /Users/ionutale/developer-playground/qwen3-tts-mlx-studio add game_voice/generate_lines.py game_voice/test_generate_lines.py game_voice/README.md
git -C /Users/ionutale/developer-playground/qwen3-tts-mlx-studio commit -m "feat(game_voice): render game lines to mp3"
```

---

## Task 5: Generate the real voice pack

**Files (game):**
- Create: `static/voice/<id>.mp3` (×N), `static/voice/manifest.json`

**Interfaces:**
- Consumes: `voice/lines.json` (Task 2), `game_voice/*` (Tasks 3–4).
- Produces: the committed clip set the runtime plays.

This task has a **human gate**: the parent auditions the takes and picks one.

- [ ] **Step 1: Generate auditions**

Run (studio root):

```bash
.venv/bin/python game_voice/design_voice.py --takes 3 --outdir outputs/auditions/buddy
```

- [ ] **Step 2: HUMAN — audition and choose**

Play `outputs/auditions/buddy/take-1.wav` … `take-3.wav` and pick the warmest, clearest take. Continuing requires the chosen take's filename.

- [ ] **Step 3: Save the chosen take to the Library**

Replace `take-2.wav` below with the chosen take:

```bash
.venv/bin/python game_voice/design_voice.py \
    --save-as buddy --from outputs/auditions/buddy/take-2.wav
```

Expected: `[design] saved voice 'buddy' → .../voices/buddy`.

- [ ] **Step 4: Render every clip**

Run (studio root):

```bash
GAME=/Users/ionutale/games-development/financial-game-4-years-old
.venv/bin/python game_voice/generate_lines.py \
    --lines "$GAME/voice/lines.json" --voice buddy \
    --out "$GAME/static/voice" --format mp3 --bitrate 96
```

Expected: `<N> clips, <X> MB` and files `static/voice/<id>.mp3` + `manifest.json`.

- [ ] **Step 5: Verify the pack**

Run:

```bash
.venv/bin/python - <<'PY'
import json, pathlib
game = pathlib.Path("/Users/ionutale/games-development/financial-game-4-years-old")
lines = json.loads((game / "voice/lines.json").read_text())
missing = [e["id"] for e in lines
           if not (game / "static/voice" / f'{e["id"]}.mp3').is_file()
           or (game / "static/voice" / f'{e["id"]}.mp3').stat().st_size == 0]
print("total:", len(lines), "missing:", missing)
assert not missing, missing
PY
```

Expected: `total: <N> missing: []`.

- [ ] **Step 6: Commit** (game repo)

```bash
git -C /Users/ionutale/games-development/financial-game-4-years-old add static/voice
git -C /Users/ionutale/games-development/financial-game-4-years-old commit -m "feat: pre-recorded Buddy voice pack"
```

---

## Task 6: Cut the runtime over to bundled audio

One atomic refactor: settings, player, every call site and Grown-up Setup change together, so the tree is green at the end of the task.

**Files:**
- Modify: `src/lib/game/settings.ts`, `src/lib/game/settings.svelte.ts`, `src/lib/game/settings.spec.ts`, `src/lib/game/speech.ts`
- Create: `src/lib/game/speech.spec.ts`
- Modify: `src/lib/components/Greeting.svelte`, `StartScreen.svelte`, `Setup.svelte`, `Store.svelte`, `TaskTidy.svelte`, `TaskWater.svelte`, `TaskFeed.svelte`, `JobBoard.svelte`, `ToysRoom.svelte`, `TuckIn.svelte`, `DreamReached.svelte`

**Interfaces:**
- Consumes: `spoken`, `TOGGLE_ON` (Task 1), `voiceMap` (Task 2).
- Produces: `Settings = { voiceEnabled: boolean }`, `speakFragments(texts: string[]): void`, `cancelSpeech(): void`.

- [ ] **Step 1: Rewrite the settings spec for the new shape**

Replace the whole body of `src/lib/game/settings.spec.ts` with:

```ts
import { describe, expect, it } from 'vitest';
import type { StorageLike } from './persistence';
import { DEFAULT_SETTINGS, loadSettings, saveSettings, SETTINGS_KEY } from './settings';

function mapStorage(): StorageLike & { raw: Map<string, string> } {
	const raw = new Map<string, string>();
	return {
		raw,
		getItem: (key) => raw.get(key) ?? null,
		setItem: (key, value) => void raw.set(key, value),
		removeItem: (key) => void raw.delete(key)
	};
}

/** Fresh installs and any unreadable save land here: silent. */
const SILENT = { voiceEnabled: false };

describe('grown-up settings', () => {
	it('defaults to silent when nothing is stored', () => {
		expect(DEFAULT_SETTINGS).toEqual(SILENT);
		expect(loadSettings(mapStorage())).toEqual(SILENT);
	});

	it('a stored choice to turn voice on wins over the silent default', () => {
		const storage = mapStorage();
		saveSettings({ voiceEnabled: true }, storage);
		expect(loadSettings(storage)).toEqual({ voiceEnabled: true });
	});

	it('ignores a legacy voiceURI from the old actor picker', () => {
		const storage = mapStorage();
		storage.setItem(SETTINGS_KEY, JSON.stringify({ voiceEnabled: true, voiceURI: 'voice-bella' }));
		expect(loadSettings(storage)).toEqual({ voiceEnabled: true });
	});

	it('falls back to silence for corrupt json', () => {
		const storage = mapStorage();
		storage.setItem(SETTINGS_KEY, '{not json');
		expect(loadSettings(storage)).toEqual(SILENT);
	});

	it('falls back to silence for foreign shapes', () => {
		const storage = mapStorage();
		storage.setItem(SETTINGS_KEY, JSON.stringify({ voiceEnabled: 'yes' }));
		expect(loadSettings(storage)).toEqual(SILENT);
		storage.setItem(SETTINGS_KEY, JSON.stringify(['voiceEnabled']));
		expect(loadSettings(storage)).toEqual(SILENT);
		storage.setItem(SETTINGS_KEY, JSON.stringify(null));
		expect(loadSettings(storage)).toEqual(SILENT);
	});

	it('survives a storage that throws', () => {
		const broken: StorageLike = {
			getItem: () => {
				throw new Error('nope');
			},
			setItem: () => {
				throw new Error('nope');
			},
			removeItem: () => {
				throw new Error('nope');
			}
		};
		expect(loadSettings(broken)).toEqual(SILENT);
		expect(() => saveSettings({ voiceEnabled: false }, broken)).not.toThrow();
	});
});
```

- [ ] **Step 2: Simplify `src/lib/game/settings.ts`**

Replace the `Settings` type, `DEFAULT_SETTINGS`, the `isVoiceURI` helper, and `loadSettings` with:

```ts
export type Settings = {
	/**
	 * When false the game stays silent; text bubbles always keep the words.
	 * New installs are silent — a grown-up turns voice on in Setup. A stored
	 * preference always wins over this default.
	 */
	voiceEnabled: boolean;
};

export const DEFAULT_SETTINGS: Settings = { voiceEnabled: false };

export function loadSettings(storage: StorageLike = defaultStorage()): Settings {
	try {
		const raw = storage.getItem(SETTINGS_KEY);
		if (raw === null) return { ...DEFAULT_SETTINGS };
		const parsed: unknown = JSON.parse(raw);
		if (typeof parsed !== 'object' || parsed === null) return { ...DEFAULT_SETTINGS };
		const stored = parsed as Record<string, unknown>;
		if (typeof stored.voiceEnabled !== 'boolean') return { ...DEFAULT_SETTINGS };
		// Older saves may carry `voiceURI` (the retired actor picker); ignored.
		return { voiceEnabled: stored.voiceEnabled };
	} catch {
		return { ...DEFAULT_SETTINGS };
	}
}
```

Leave `SETTINGS_KEY` and `saveSettings` unchanged.

- [ ] **Step 3: Simplify `src/lib/game/settings.svelte.ts`**

Replace the whole file with:

```ts
import { loadSettings, saveSettings, type Settings } from './settings';

/**
 * The one mutable copy of the grown-up preferences, persisted per device.
 * Kept separate from the game save on purpose (see settings.ts).
 */
export const settings = $state<Settings>(loadSettings());

export function setVoiceEnabled(value: boolean): void {
	settings.voiceEnabled = value;
	saveSettings(settings);
}

/** Flips the switch and returns the new value. */
export function toggleVoice(): boolean {
	setVoiceEnabled(!settings.voiceEnabled);
	return settings.voiceEnabled;
}
```

- [ ] **Step 4: Write the failing player test**

Create `src/lib/game/speech.spec.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockSettings } = vi.hoisted(() => ({ mockSettings: { voiceEnabled: true } }));

vi.mock('./settings.svelte', () => ({ settings: mockSettings }));
vi.mock('$app/paths', () => ({ base: '' }));
vi.mock('./voice-map', () => ({
	voiceMap: { 'Good morning!': 'id-greet', PLAN: 'id-plan' }
}));

import { cancelSpeech, speakFragments } from './speech';

class FakeAudio {
	static instances: FakeAudio[] = [];
	src: string;
	onended: (() => void) | null = null;
	onerror: (() => void) | null = null;
	preload = '';
	played = false;
	paused = false;
	constructor(src: string) {
		this.src = src;
		FakeAudio.instances.push(this);
	}
	play(): Promise<void> {
		this.played = true;
		return Promise.resolve();
	}
	pause(): void {
		this.paused = true;
	}
	end(): void {
		this.onended?.();
	}
}

function srcs(): string[] {
	return FakeAudio.instances.map((a) => a.src);
}

beforeEach(() => {
	FakeAudio.instances = [];
	mockSettings.voiceEnabled = true;
	vi.stubGlobal('Audio', FakeAudio);
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('the voice player', () => {
	it('plays fragments in order', () => {
		speakFragments(['Good morning!', 'PLAN']);
		expect(srcs()).toEqual(['/voice/id-greet.mp3', '/voice/id-plan.mp3']);
		expect(FakeAudio.instances[0].played).toBe(true);
		expect(FakeAudio.instances[1].played).toBe(false);
		FakeAudio.instances[0].end();
		expect(FakeAudio.instances[1].played).toBe(true);
	});

	it('skips fragments with no clip instead of throwing', () => {
		expect(() => speakFragments(['no such line'])).not.toThrow();
		expect(FakeAudio.instances).toHaveLength(0);
	});

	it('does nothing for an empty fragment list', () => {
		speakFragments([]);
		expect(FakeAudio.instances).toHaveLength(0);
	});

	it('stays silent when voice is off', () => {
		mockSettings.voiceEnabled = false;
		speakFragments(['Good morning!']);
		expect(FakeAudio.instances).toHaveLength(0);
	});

	it('stays silent under ?mute=1 even with voice on', () => {
		vi.stubGlobal('location', { search: '?mute=1' });
		speakFragments(['Good morning!']);
		expect(FakeAudio.instances).toHaveLength(0);
	});

	it('cancels the previous line, never overlapping', () => {
		speakFragments(['Good morning!', 'PLAN']);
		const first = FakeAudio.instances[0];
		speakFragments(['PLAN']);
		expect(first.paused).toBe(true);
		first.end();
		// The cancelled line does not advance into its second fragment.
		expect(FakeAudio.instances.filter((a) => a.played && a.src === '/voice/id-plan.mp3'))
			.toHaveLength(1);
	});

	it('never throws when Audio is unavailable', () => {
		vi.stubGlobal('Audio', undefined);
		expect(() => speakFragments(['Good morning!'])).not.toThrow();
	});

	it('cancelSpeech is safe with nothing playing', () => {
		expect(() => cancelSpeech()).not.toThrow();
	});
});
```

- [ ] **Step 5: Run it to verify it fails**

Run: `pnpm exec vitest run src/lib/game/speech.spec.ts`
Expected: FAIL — `speakFragments is not a function`.

- [ ] **Step 6: Rewrite `src/lib/game/speech.ts`**

```ts
import { base } from '$app/paths';
import { settings } from './settings.svelte';
import { voiceMap } from './voice-map';

/**
 * Buddy's voice, played from bundled audio. Fire-and-forget: every call cancels
 * the previous line and plays the new one's fragments in order. Silent when the
 * grown-up turned Voice off, when `?mute=1` is in the URL, or when a clip is
 * missing or blocked. Text bubbles always keep the words.
 */

type AudioLike = {
	src: string;
	preload: string;
	onended: (() => void) | null;
	onerror: (() => void) | null;
	play: () => Promise<void> | void;
	pause: () => void;
};

function isMutedByQuery(): boolean {
	try {
		return typeof location !== 'undefined' && location.search.includes('mute=1');
	} catch {
		return false;
	}
}

function voiceAllowed(): boolean {
	return settings.voiceEnabled && !isMutedByQuery();
}

function urlFor(text: string): string | null {
	const id = voiceMap[text];
	return id ? `${base}/voice/${id}.mp3` : null;
}

let playing: AudioLike[] | null = null;

/** Stop whatever is speaking. Never throws. */
export function cancelSpeech(): void {
	if (!playing) return;
	for (const clip of playing) {
		try {
			clip.onended = null;
			clip.onerror = null;
			clip.pause();
		} catch {
			/* voice is optional, never fatal */
		}
	}
	playing = null;
}

function makeAudio(url: string): AudioLike | null {
	try {
		if (typeof Audio === 'undefined') return null;
		const clip = new Audio(url) as unknown as AudioLike;
		clip.preload = 'auto';
		return clip;
	} catch {
		return null;
	}
}

/** Cancel-then-speak a sequence of fragments. Never throws, never blocks. */
export function speakFragments(texts: string[]): void {
	if (!voiceAllowed()) return;
	const clips: AudioLike[] = [];
	for (const text of texts) {
		const url = urlFor(text);
		if (!url) continue;
		const clip = makeAudio(url);
		if (clip) clips.push(clip);
	}
	if (clips.length === 0) return;
	cancelSpeech();
	playing = clips;

	let index = 0;
	const playNext = (): void => {
		const clip = clips[index++];
		if (!clip) {
			playing = null;
			return;
		}
		clip.onended = playNext;
		clip.onerror = playNext;
		try {
			const started = clip.play();
			if (started && typeof started.catch === 'function') {
				// Autoplay blocked (pre-gesture) or decode error: stay silent.
				started.catch(() => undefined);
			}
		} catch {
			/* voice is optional, never fatal */
		}
	};
	playNext();
}
```

- [ ] **Step 7: Run the player test**

Run: `pnpm exec vitest run src/lib/game/speech.spec.ts src/lib/game/settings.spec.ts`
Expected: PASS (settings 6 tests, player 8 tests).

- [ ] **Step 8: Swap every speaking call site**

In each component below, add `import { spoken } from '$lib/game/spoken';` next to the existing `$lib/game/lines` import, change the speech import to `import { speakFragments } from '$lib/game/speech';`, and replace the calls exactly:

| File | Remove | Use instead |
|---|---|---|
| `Greeting.svelte` | `speak(lines.greetingPlan(game.state))` | `speakFragments(spoken.greetingPlan(game.state))` |
| `StartScreen.svelte` | `speak(lines.start(game.state))` | `speakFragments(spoken.start(game.state))` |
| `TaskTidy.svelte` | `speak(lines.tidy(game.state))` and `speak(lines.tidyPaid(game.state))` | `speakFragments(spoken.tidy(game.state))` and `speakFragments(spoken.tidyPaid(game.state))` |
| `TaskWater.svelte` | `speak(lines.water(game.state))` and `speak(lines.waterPaid(game.state))` | `speakFragments(spoken.water(game.state))` and `speakFragments(spoken.waterPaid(game.state))` |
| `TaskFeed.svelte` | `speak(lines.feed(game.state))` and `speak(lines.feedPaid(game.state))` | `speakFragments(spoken.feed(game.state))` and `speakFragments(spoken.feedPaid(game.state))` |
| `JobBoard.svelte` | `speak(lines.cap(game.state))` | `speakFragments(spoken.cap(game.state))` |
| `ToysRoom.svelte` | `speak(lines.toysEmpty(game.state))` | `speakFragments(spoken.toysEmpty(game.state))` |
| `TuckIn.svelte` | `speak(lines.recapLine(game.state))` | `speakFragments(spoken.recapLine(game.state))` |
| `DreamReached.svelte` | `speak(lines.dreamReached(game.state))` | `speakFragments(spoken.dreamReached(game.state))` |

In `Store.svelte`: change the speech import to `speakFragments`, drop `storeCompare` from the `$lib/game/lines` import (`import { lines } from '$lib/game/lines';`), and change:

```ts
// opening line
speakFragments(spoken.store(game.state));
// buy beat
speakFragments(spoken.storeBought(game.state));
// already owned
speakFragments(spoken.storeOwned(game.state));
// cannot afford — replace the old `compare = storeCompare(...); speak(compare);`
compare = spoken.storeCompare('ball', game.state).join(' ');
speakFragments(spoken.storeCompare('ball', game.state));
// save
speakFragments(spoken.storeSave(game.state));
```

`lines.*` keeps feeding every on-screen `<Bubble>`, toast and testid node — only `speak(...)` calls change.

- [ ] **Step 9: Trim `Setup.svelte`**

Remove the `refreshVoices`, `setVoiceURI`, `voiceOptions` imports and the `$effect` that calls `refreshVoices()` and wires `voiceschanged`. Change the speech import to `import { cancelSpeech, speakFragments } from '$lib/game/speech';` and add `import { spoken, TOGGLE_ON } from '$lib/game/spoken';`.

Replace the three speaking paths:

```ts
// setup effect
speakFragments(spoken.setup(game.state));

function onToggleVoice(): void {
	const nowOn = toggleVoice();
	if (nowOn) speakFragments([TOGGLE_ON]);
	else cancelSpeech();
}

function previewVoice(): void {
	speakFragments(spoken.voiceSample(game.state));
}
```

Delete `pickVoice` and the whole actor-picker block inside `{#if settings.voiceEnabled}` (the `voiceOptions.list.length > 0` branch, the `voice-picker` div, and the "No extra voices found…" hint). Replace it with a single preview button:

```svelte
{#if settings.voiceEnabled}
	<button
		type="button"
		class="btn btn-ghost"
		data-testid="voice-preview"
		onclick={previewVoice}
	>
		Hear Buddy
	</button>
{/if}
```

Delete the now-unused CSS rules `.voice-picker`, `.picker-label`, `.voice-list`, `.voice-option`, `.voice-option.selected`, `.voice-option:focus-visible`, `.voice-lang`.

- [ ] **Step 10: Type-check and unit-test everything**

Run: `pnpm check && pnpm test`
Expected: `pnpm check` 0 errors, no reference to the removed settings surface; all vitest specs pass.

- [ ] **Step 11: Commit**

```bash
git add src/lib/game src/lib/components
git commit -m "feat: cut the runtime over to the pre-recorded voice"
```

---

## Task 7: End-to-end voice coverage

**Files:**
- Modify: `e2e/settings.spec.ts`
- Create: `e2e/voice.spec.ts`

**Interfaces:**
- Consumes: the built app, `completeSetup` from `./helpers`, `/voice/*.mp3` requests.
- Produces: e2e proof the right clip plays and nothing plays when silenced.

- [ ] **Step 1: Rewrite `e2e/settings.spec.ts`**

Replace the whole file with (no speech stub — the voice is now audio requests, covered in `voice.spec.ts`):

```ts
import { expect, test, type Page } from '@playwright/test';
import { completeSetup } from './helpers';

/**
 * Voice lives in Grown-up Setup and persists per device — deliberately separate
 * from the game save. Text bubbles keep every word either way.
 */

function storedSettings(page: Page) {
	return page.evaluate(() => {
		const raw = localStorage.getItem('money-day-settings');
		return raw === null ? null : JSON.parse(raw);
	});
}

test.describe('grown-up settings: voice', () => {
	test('a fresh install is silent; the switch turns voice on and sticks', async ({ page }) => {
		await page.goto('/');
		await expect(page.getByTestId('voice-toggle')).toHaveAttribute('aria-checked', 'false');

		await completeSetup(page);
		await page.getByTestId('open-setup-button').click();
		await page.getByTestId('voice-toggle').click();
		await expect(page.getByTestId('voice-toggle')).toHaveAttribute('aria-checked', 'true');
		await page.getByTestId('setup-close-button').click();

		await page.reload();
		await page.getByTestId('open-setup-button').click();
		await expect(page.getByTestId('voice-toggle')).toHaveAttribute('aria-checked', 'true');
		expect(await storedSettings(page)).toEqual({ voiceEnabled: true });
	});

	test('there is no actor picker any more, only a sample button', async ({ page }) => {
		await page.goto('/');
		await completeSetup(page);
		await page.getByTestId('open-setup-button').click();
		await page.getByTestId('voice-toggle').click();
		await expect(page.getByTestId('voice-preview')).toBeVisible();
		await expect(page.locator('[data-testid^="voice-option"]')).toHaveCount(0);
	});

	test('starting the game over keeps the voice choice', async ({ page }) => {
		await page.goto('/');
		await completeSetup(page);
		await page.getByTestId('open-setup-button').click();
		await page.getByTestId('voice-toggle').click();
		await page.getByTestId('reset-game-button').click();
		await page.getByTestId('reset-confirm').click();

		await expect(page.getByTestId('name-input')).toBeVisible();
		await expect(page.getByTestId('voice-toggle')).toHaveAttribute('aria-checked', 'true');
		expect(await storedSettings(page)).toEqual({ voiceEnabled: true });
	});
});
```

- [ ] **Step 2: Add the audio-request spec**

Create `e2e/voice.spec.ts`:

```ts
import { expect, test, type Page } from '@playwright/test';
import { completeSetup } from './helpers';

/**
 * The voice is bundled audio: assert the app requests the right clip and that
 * silencing it requests nothing. Requests are stubbed, so no real audio plays.
 */

function captureVoice(page: Page): string[] {
	const requested: string[] = [];
	page.route('**/voice/*.mp3', (route) => {
		requested.push(route.request().url());
		return route.fulfill({ status: 200, contentType: 'audio/mpeg', body: Buffer.alloc(0) });
	});
	return requested;
}

test.describe('the pre-recorded voice', () => {
	test('voice on requests a clip for the scene', async ({ page }) => {
		await page.addInitScript(() => {
			localStorage.setItem('money-day-settings', JSON.stringify({ voiceEnabled: true }));
		});
		const requested = captureVoice(page);

		await page.goto('/');
		await completeSetup(page);
		await page.getByTestId('start-button').click({ force: true });
		await expect(page.getByTestId('greeting-start')).toBeVisible();

		await expect.poll(() => requested.some((url) => url.includes('/voice/'))).toBe(true);
	});

	test('?mute=1 requests no clips even with voice on', async ({ page }) => {
		await page.addInitScript(() => {
			localStorage.setItem('money-day-settings', JSON.stringify({ voiceEnabled: true }));
		});
		const requested = captureVoice(page);

		await page.goto('/?mute=1');
		await completeSetup(page);
		await page.getByTestId('start-button').click({ force: true });
		await expect(page.getByTestId('greeting-start')).toBeVisible();

		expect(requested).toHaveLength(0);
	});

	test('voice off requests no clips', async ({ page }) => {
		const requested = captureVoice(page);
		await page.goto('/');
		await completeSetup(page);
		await page.getByTestId('start-button').click({ force: true });
		await expect(page.getByTestId('greeting-start')).toBeVisible();

		expect(requested).toHaveLength(0);
	});
});
```

- [ ] **Step 3: Run the full e2e suite**

Run: `pnpm test:e2e`
Expected: all specs pass, including the rewritten `settings.spec.ts` and new `voice.spec.ts`.

- [ ] **Step 4: Commit**

```bash
git add e2e/settings.spec.ts e2e/voice.spec.ts
git commit -m "test: end-to-end coverage for the pre-recorded voice"
```

---

## Task 8: Record the decision

**Files:**
- Create: `docs/adr/0007-pre-recorded-voice-assets.md`
- Modify: `README.md`, `CONTEXT.md`

**Interfaces:**
- Consumes: nothing.
- Produces: documentation only.

- [ ] **Step 1: Write the ADR**

Create `docs/adr/0007-pre-recorded-voice-assets.md`:

```markdown
# Pre-recorded voice assets instead of Web Speech

Buddy's voice is a set of bundled MP3 clips generated once with Qwen3-TTS and
played with `<audio>`, replacing the device Web Speech API. Web Speech gave
every phone a different actor and a flat delivery; the parent wanted one warm,
consistent Buddy. The accepted trade-offs: the clips add a few megabytes to the
static build, the child's name is no longer spoken (an arbitrary name cannot be
pre-rendered — the on-screen text keeps it), and the Grown-up Setup no longer
offers an actor picker. Voice stays off by default, `?mute=1` still silences,
and the app remains a static SPA with no backend.
```

- [ ] **Step 2: Update the README Voice bullet**

In `README.md`, replace the **Voice** bullet (line 11) with:

```markdown
- **Voice:** optional — Buddy speaks from bundled audio clips, **off by default**; a grown-up turns it on in Grown-up Setup (the gear) and can hear a sample there. Every line is mirrored on screen as text; append `?mute=1` to force silence
```

- [ ] **Step 3: Update the glossary**

In `CONTEXT.md`, replace the **Grown-up Setup** entry's body with:

```
The only text screen: first-run name entry, the Voice switch and a "Hear Buddy" sample (voice is off until a grown-up turns it on; Buddy's voice is a single pre-recorded actor), and game reset. Exists for the parent, never required for play.
```

- [ ] **Step 4: Verify everything is green**

Run: `pnpm check && pnpm test && pnpm test:e2e`
Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add docs/adr/0007-pre-recorded-voice-assets.md README.md CONTEXT.md
git commit -m "docs: pre-recorded voice — ADR, README, glossary"
```

---

## Self-Review Notes

- **Spec coverage:** catalogue (§2 → Task 1), enumeration + artifacts (§3 → Task 2), studio design (§1 → Task 3), studio rendering (§4 → Task 4), asset generation (§1 → Task 5), player (§5 → Task 6), call sites (§6 → Task 6), settings (§7 → Task 6), Setup (§8 → Task 6), tests (§Testing → Tasks 1, 2, 6, 7, 3, 4), docs (§11 → Task 8). The spec's `voiceSample` survives as the "Hear Buddy" preview button.
- **Deferred per spec non-goals:** multiple voices, offline caching, per-name audio.
- **Review Focus → tests:** pre-gesture autoplay (Task 6 player spec: `started.catch` + "never throws when Audio is unavailable"); missing fragment (Task 6: "skips fragments with no clip"); muted-while-on (Task 6 player spec + Task 7 e2e); legacy settings (Task 6 settings spec: "ignores a legacy voiceURI"); rapid scene changes (Task 6 player spec: "cancels the previous line").
- **Green-tree ordering:** Tasks 1–5 are additive; Task 6 is the single cutover; no intermediate commit leaves `pnpm check` red.
- **Risk:** per-clip EBU R128 on very short clips can sound uneven. If so, change `render_lines`'s `export_audio` call to `loudnorm=False` and regenerate (Task 5 Step 4); `voice/lines.json` is unchanged.

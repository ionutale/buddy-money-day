# Pre-recorded Buddy voice — Design

**Status:** approved in conversation (2026-09-30); awaiting written-spec review
**Supersedes:** the Web Speech API bullet in `README.md` (see ADR-0007)

## Problem

Buddy's voice is the Web Speech API: the phone picks an actor, the timbre changes
per device and OS, and the delivery is flat. The parent wants one warm, consistent
Buddy — a real voice, the same on every phone — generated locally with the
Qwen3-TTS MLX studio (`/Users/ionutale/developer-playground/qwen3-tts-mlx-studio`).

Everything else must hold: voice stays **off by default**, `?mute=1` forces
silence, every line stays on screen as text, and the app stays a static
client-side SPA with no backend.

## Goal

Replace Web Speech with bundled, pre-generated audio files played by the game,
in a single designed voice, without changing any on-screen text or game rule.

## Non-goals

- Multiple voices or keeping the device actor picker.
- Speaking the child's name (arbitrary input cannot be pre-rendered).
- Service-worker/offline caching, streaming, or any backend.
- New game content, economy, or persisted state.

## Design

### 1. The voice is designed once, then cloned

A designed voice is not reproducible from its description — the studio saves the
generated clip as a reference and reuses it by **voice cloning**. So:

1. **Design** (one-time, in the studio UI or via `game_voice/design_voice.py`):
   Voice Design with this description —
   *"A warm, gentle female storyteller with a soft, clear voice, speaking slowly
   and kindly like a preschool teacher reading to a small child — light
   encouragement, clean articulation."*
   Generate 3 takes, audition, pick one.
2. **Save to Library** as `buddy` (stores that clip + its transcript as
   `voices/buddy/reference.wav` + `profile.json`).
3. Every game clip is then rendered with VoiceClone against `buddy`, so the
   timbre and delivery are identical across all files.

### 2. The spoken catalogue (`spoken.ts`) — one source of truth

New pure TS module `src/lib/game/spoken.ts`. For every entry in `lines.ts` it
returns the **fragments** Buddy actually says, as `string[]` — usually one, two
or three for the combinatorial lines. The name is omitted; finite values
(goal label, coin counts) are interpolated.

Compile-time parity:

```ts
export const spoken = {
  // ...one entry per key of `lines`, plus `storeCompare`
} satisfies Record<keyof typeof lines, (s: GameState) => string[]> & {
  storeCompare: (toy: ToyId, s: GameState) => string[];
};
```

`lines.*` keeps driving every on-screen `<Bubble>` and toast unchanged; only the
voice path moves to `spoken.*`.

Spoken forms (name dropped from `setup`, `start`, `greetingPlan`,
`dreamReached`):

| key | spoken fragments | variants |
|---|---|---|
| `setup` | `"Hello again!"` / `"Hello! A grown-up can type a name, or skip."` | named / unnamed |
| `voiceSample` | `"Hi there! This is how Buddy will sound."` | 1 |
| `start` | `"Hi! Buddy is ready for a Money Day."` | 1 |
| `planLine` | `"Today we can earn 4 coins for your {goal}!"` | 2 |
| `greetingPlan` | `"Good morning!"` + `planLine` fragment | 2 |
| `tidy` / `tidyPaid` / `tidyNudge` | as in `lines.ts` | 1 each |
| `water` / `waterPaid` | as in `lines.ts` (`"One coin earned!"` dedupes with `feedPaid`) | 1 each |
| `feed` / `feedPaid` | as in `lines.ts` | 1 each |
| `cap` | `"All chores done! More tomorrow."` | 1 |
| `store` | `"Time to choose! A toy now, or save for your {goal}?"` | 2 |
| `storeSave` | `"Save the rest for your {goal}."` | 2 |
| `storeBought` / `storeOwned` | as in `lines.ts` | 1 each |
| `dreamStands` | `"Your {goal} has {jar} of 12."` (jar 0–12, goal ×2) / `"Your {goal} is yours!"` (goal ×2) | 26 + 2 |
| `storeCompare` | `"That's {price} coins — you have {coins}."` (price ∈ {2,4,6,12} × coins < price) + `moreChores(short)` | 24 + 13 |
| `toysEmpty` | `"No toys yet! Do chores, then visit the store."` | 1 |
| `dreamReached` | `"You did it! You saved 12 coins for your very own {goal}!"` | 2 |
| `recapLine` | completed: `"You did it!"` + `"The {done} is yours."` + `"Your {goal} needs 12 coins — we can start tomorrow!"`; saving: `"Today you earned {n} coins."` + the `dreamStands` "has … of 12" fragment + `moreChores(remaining)`; empty jar: `"Today you earned {n} coins."` + `"Your {goal} has 0 of 12."` + `"Tomorrow we can earn more!"` | 5 (reuses earned 5, dreamStands 26, moreChores 13) + 8 |

`moreChores(n)` sentence forms (shared with `lines.ts`'s helper):
`"More chores tomorrow!"` (n<=0), `"One more chore tomorrow!"`,
`"Two more chores tomorrow!"`, `"{n} more chores tomorrow!"` (n>=3).

Also a literal toggle line `"Voice on!"` (used by Setup), declared as a constant
next to `spoken`.

Value ranges the enumerator must cover: goal ∈ `{wagon, teddy}`, `jarCoins`
0–12, `earnedTodayCoins` 0–4, toy prices ∈ `{2,4,6,12}`, `coins` on hand 0–12.

### 3. Enumerating the fragments (build step)

`pnpm voice:lines` — a Node script (`scripts/build-voice-lines.ts`, run with
`vite-node`; no new dependency) that:

1. Imports `spoken` and calls each entry over representative `GameState`s
   covering the ranges above.
2. Collects the unique fragment strings (`Set`), sorted for stability.
3. Writes:
   - `voice/lines.json` — `[{ "id", "text" }]`, `id = sha1(text)[:10]`
     (committed; the generator's input)
   - `src/lib/game/voice-map.ts` — generated `export const voiceMap:
     Record<string, string>` mapping each exact text → id (committed; the
     runtime's lookup)
4. Asserts no id collisions.

A unit test regenerates the set and asserts `voice-map.ts` is complete and in
sync (drift guard).

### 4. Rendering the audio (studio)

New `game_voice/` in the TTS studio, mirroring `narration/`'s style, tests, and
resumability:

```
game_voice/design_voice.py    --description ... --takes 3 --save-as buddy
game_voice/generate_lines.py  --lines voice/lines.json --voice buddy \
                              --out <game>/static/voice --format mp3 --bitrate 96k
```

- Reads `voice/lines.json`, synthesizes each unique fragment through
  `engine.batch_generate_voice_clone` (batched, per-chunk fallback, retries),
  resumable per fragment (re-run fills only missing files).
- Post-processes each clip: trim leading/trailing silence + `loudnorm=I=-16`,
  mono MP3 (96 kbps, 44.1 kHz) → `static/voice/<id>.mp3`.
- Writes `static/voice/manifest.json` — `{ id, text, bytes, duration, sha256 }`
  per clip — and prints a total-size summary.
- Guards: refuses to mix runs whose voice/format settings differ unless
  `--force`.

### 5. Runtime player (`speech.ts` rewrite)

Web Speech → `<audio>`. Public surface:

```ts
export function speakFragments(texts: string[]): void; // resolve → queue → play
export function cancelSpeech(): void;                  // stop + reset
```

- `voiceAllowed()` = `settings.voiceEnabled && !?mute=1` (drop `hasSpeech()`;
  feature-detect the `Audio` constructor).
- Resolves each text through `voiceMap` to `/voice/<id>.mp3`; a text with no
  entry, a blocked play, or a missing file is a silent skip — never fatal, never
  throws. Empty fragment arrays are ignored.
- Plays fragments in order with a tiny queue: preload the next as the current
  starts; each new `speakFragments` call cancels whatever is playing.
- Best-effort autoplay, unchanged from today: the pre-gesture setup line may be
  blocked until the first tap; the text is always on screen.

### 6. Call sites

`speak(lines.X(state))` → `speakFragments(spoken.X(state))` in the ~10
components that speak (`Greeting`, `StartScreen`, `Setup`, `Store`,
`TaskTidy`, `TaskWater`, `TaskFeed`, `JobBoard`, `ToysRoom`, `TuckIn`,
`DreamReached`). `Store.svelte`'s `storeCompare` path uses `spoken.storeCompare`.

### 7. Settings

`Settings` becomes `{ voiceEnabled: boolean }`. Drop `voiceURI` and the
`refreshVoices` / `voiceOptions` / `setVoiceURI` surface. A previously stored
`voiceURI` is ignored on load (silent migration, no reset). Still off by default
and persisted per device.

### 8. `Setup.svelte`

Keep the Voice on/off switch and its `data-testid="voice-toggle"`. Delete the
actor picker, the `voiceschanged` listener, and the `voice-option-*` testids.
The switch-on preview and any "sample" affordance play Buddy's own clip
(`spoken.voiceSample`). Grown-up copy loses the actor wording.

### 9. Behavior notes

- Voice off → nothing loads or plays; `?mute=1` → same.
- Assets are same-origin static files; the SPA still has no backend and no
  third-party calls (README's "no network calls" becomes "no backend calls", to
  be reworded).
- Clips are fetched individually on demand, so total bundle size does not affect
  time-to-play.

## Files touched

`src/lib/game/speech.ts` (rewrite), new `src/lib/game/spoken.ts`, new generated
`src/lib/game/voice-map.ts`, `src/lib/game/settings.ts`,
`src/lib/game/settings.svelte.ts`, `Setup.svelte`, and the speaking components
listed in §6. New `scripts/build-voice-lines.ts`, committed `voice/lines.json`,
committed `static/voice/*.mp3` + `static/voice/manifest.json`, updated
`package.json` (`voice:lines` script), `README.md`, `CONTEXT.md`, and a new
`docs/adr/0007-*`. Studio: new `game_voice/` package + tests.

## testids

Existing testids stay; `voice-toggle` is unchanged. Removed: `voice-option-default`,
`voice-option-{index}`. No new testids required.

## Testing

**Unit (vitest)**
- `spoken` covers every `keyof typeof lines` (compile-time) and every fragment is
  non-empty; name never appears in a fragment.
- `voice-map.ts` is complete and in sync with a fresh enumeration (drift guard).
- Speech player: no throw when `Audio` is absent, voice off, `?mute=1`, unknown
  text, or empty array; cancel clears the queue.
- Settings: `{ voiceEnabled }` round-trips; a legacy `voiceURI` is ignored.

**E2E (playwright)**
- Rewrite `e2e/settings.spec.ts` voice cases for the switch-only UI: fresh install
  is silent; the switch turns voice on and sticks across reload and reset; no
  actor picker exists.
- Route-intercept `/voice/*.mp3` to assert the correct clip is requested when a
  scene mounts (e.g. greeting → the plan fragment), and that `?mute=1` and
  voice-off request nothing.
- Update `e2e/meaning.spec.ts`'s greeting-spoken assertion to the audio request.

**Studio (pytest)**
- `game_voice`: fragment→file naming, dedup, resumability, manifest integrity,
  settings-mismatch guard, size summary — with the engine faked, like
  `narration/test_narrate.py`.

## Success criteria

- On any phone, Buddy speaks in one consistent, warm voice; switching devices
  changes nothing about the voice.
- Every spoken line from `lines.ts` has an audio clip that plays at the right
  moment; on-screen text is unchanged.
- Voice off and `?mute=1` produce no audio and no asset requests.
- All existing playthrough specs stay green (with the voice specs rewritten as
  above).

## Risks / notes

- **Reference quality drives consistency.** The Library reference should be a
  clean 5–10 s take; a noisy or clipped one degrades every clip.
- **Fragment seams.** Sequence joins (`greetingPlan`, `recapLine`,
  `storeCompare`) are joined with no gap; if a seam sounds off, the fallback is
  to render that line as a single clip (higher file count, no runtime change).
- **Autoplay.** Mobile blocks audio before a gesture; unaffected by this change,
  but worth a manual phone check on the setup → start transition.

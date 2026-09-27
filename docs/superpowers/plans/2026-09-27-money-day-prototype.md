# Money Day Prototype Implementation Plan

> **For agentic workers:** Executed natively in this session (OpenCode; no todo tool — this file's checkboxes are the tracker). Spec = `CONTEXT.md` + `docs/adr/*` + the grilling session that produced them.

**Goal:** A rough, fully playable prototype of one Money Day loop on a phone: earn Coins via Helping Tasks → feed Buddy (need) → optional Friend giving → Shelf (save default vs Temptation) → jars ritual → tuck-in; Goals reached over 2–3 Money Days; progress persists per device.

**Architecture:** Pure immutable game engine (framework-free TypeScript, unit-tested) + a thin Svelte 5 runes store + one component per scene. SvelteKit static SPA (`adapter-static`, SSR off), localStorage saves, Web Speech TTS (mutable for tests), all interactive elements carry `data-testid`s for Playwright.

**Tech Stack:** SvelteKit 2.63 / Svelte 5.56 (runes) / Vite 8 / TypeScript 6 / pnpm; vitest for engine units; Playwright for e2e; @fontsource/fredoka.

**Spec:** `CONTEXT.md`, `docs/adr/0001..0004`

## Global Constraints

- English-only TTS lines; zero reading required; numerals only as support.
- No backend, no accounts, no network calls; localStorage only; per-device saves (ADR-0004).
- Phase machine: `setup → start → greeting → task-tidy → task-water → hunger → friend → shelf → jars → [goal-reached → goal-pick] → tuck-in → start`.
- Economy: `TIDY_REWARD 2`, `WATER_REWARD 1` (3/day), `FEED_COST 1`, `LOLLIPOP_COST 2`, giving ≤ `SWING_PLANKS 3`/day, `GOAL_COST 6`, `TIDY_TOYS 3`, `WATER_DROPS 3`.
- Never punish; save and spend both praised; skip-everything always reaches tuck-in; no action can make Coins negative; all transitions clamp.
- `?mute=1` disables voice; every interactive element has a unique `data-testid`.
- Both `pnpm test` (vitest) and `pnpm test:e2e` (Playwright) green before "done".

## Review Focus

These are the failure modes no happy-path test catches; each has a pinned test in its owning task:

1. **Tap-spam / double-fire** on any button must not fire a transition twice (clamping, phase guards).
2. **Jar overflow** — reaching a Goal with more than 6 Coins must carry the remainder into the next Goal.
3. **Skip-everything path** — no feed, no give, no explicit save action beyond the default must still reach tuck-in.
4. **Reload mid-day** — durable state (jar/home/day/planks) survives; transient day state restarts; nothing corrupts.
5. **Foreign/corrupt localStorage** — boots a fresh game instead of crashing.

## Tasks

### Task 0 — Scaffold + repo ✅ (done)

- [x] `sv create` minimal TS template, pnpm, initial commit `26a362b`

### Task 1 — Static SPA config

**Files:** `vite.config.ts`, `src/routes/+layout.ts`, `package.json`

- [ ] Replace `adapter-auto` with `@sveltejs/adapter-static` (`fallback: 'index.html'`), keeping the inline `sveltekit({...})` plugin config style the scaffold uses
- [ ] Add `src/routes/+layout.ts`: `export const ssr = false; export const prerender = false;`
- [ ] `pnpm build` → assert `build/index.html` exists; `pnpm preview` serves `/`
- [ ] Commit: `chore: configure adapter-static SPA`

### Task 2 — Docs

**Files:** `CONTEXT.md`, `docs/adr/0001..0004`, `README.md`, this plan

- [ ] Write glossary, ADRs, README, plan (this file)
- [ ] Commit: `docs: glossary, ADRs, prototype plan`

### Task 3 — Game engine + unit tests (TDD, engine seam)

**Files:** `src/lib/game/economy.ts`, `src/lib/game/types.ts`, `src/lib/game/state.ts`, `src/lib/game/state.spec.ts`

**Interfaces (produced for all later tasks):**

```ts
type Phase = 'setup'|'start'|'greeting'|'task-tidy'|'task-water'|'hunger'
           | 'friend'|'shelf'|'jars'|'goal-reached'|'goal-pick'|'tuck-in';

type GameState = {
  schemaVersion: 1;
  childName: string;        // '' until set/skipped
  nameSkipped: boolean;
  day: number;              // 1-based
  goal: GoalId;             // current Goal
  jarCoins: number;
  homeItems: GoalId[];
  planks: number;           // 0..3, bird's swing
  buddySad: boolean;        // carried across days
  lollipopsTotal: number;
  // transient day state (reset by resetDayTransients):
  phase: Phase;
  coins: number;
  tidyDone: number;         // 0..3
  waterDone: number;        // 0..3
  fedToday: boolean;
  gaveToday: number;        // coins given today (0..3)
  lollipopToday: boolean;
};

// pure, immutable transitions returning a new GameState:
newGame, submitName(s,name), skipName(s), beginDay(s), greetDone(s),
tidyToy(s), waterDrop(s), feedBuddy(s), skipFeed(s), giveCoin(s), friendDone(s),
saveAll(s), buyLollipop(s), continueAfterLollipop(s), jarsDone(s),
goalCelebrated(s), pickGoal(s,goal), tuckInDone(s), resetDayTransients(s),
nextGoalOptions(s)
```

**Test scenarios (vitest, all outside-in through the transitions above):**

- [ ] new: phase `setup`, day 1, jar 0, coins 0, goal `kite`
- [ ] `submitName`/`skipName` → `start`; name trimmed; skip sets flag
- [ ] `beginDay` → `greeting`, transients reset
- [ ] tidy: 3× `tidyToy` → +2 coins and phase `task-water` on the 3rd; extra calls clamp (no extra coins)
- [ ] water: 3× → +1 coin and phase `hunger`; extra calls clamp
- [ ] feed: with coins → −1, `fedToday`, clears `buddySad`, phase `friend`; **with 0 coins → no-op, stays `hunger`** (Review Focus 1)
- [ ] give: decrements coins + increments planks; clamps at 3 planks; no-op at 0 coins; `friendDone` → `shelf`
- [ ] `saveAll` moves all coins to jar → `jars`; `buyLollipop` requires 2 coins, sets `lollipopToday`, second call no-op (Review Focus 1)
- [ ] `continueAfterLollipop` jars the remainder → `jars`
- [ ] `jarsDone`: jar ≥ 6 → `goal-reached`, else `tuck-in`
- [ ] `pickGoal`: home += old goal, jar −= 6 keeping remainder (**jar 8 → 2**, Review Focus 2) → `tuck-in`; `nextGoalOptions` returns 3, preferring un-collected
- [ ] `tuckInDone`: day+1, `buddySad` set iff `!fedToday`, transients reset, phase `start`
- [ ] full two-day run with no feeding/giving reaches `goal-reached` at day 2 (**Review Focus 3**)
- [ ] Commit: `feat: pure game engine with unit tests`

### Task 4 — Persistence + unit tests

**Files:** `src/lib/game/persistence.ts`, `src/lib/game/persistence.spec.ts`

- [ ] `StorageLike` interface (`getItem/setItem/removeItem`); `loadState(storage)`, `saveState(state, storage)`, `clearSave(storage)`, `SAVE_KEY = 'money-day-save'`
- [ ] Load: parse → validate `schemaVersion === 1` → `resetDayTransients` (durable fields kept, phase `start`); any error/unknown version → `newGame()` (Review Focus 5)
- [ ] Tests: roundtrip; corrupt JSON → fresh; wrong version → fresh; no key → fresh; loaded state resets transient day fields but keeps jar/home/day/planks; `clearSave` removes key
- [ ] Commit: `feat: versioned localStorage persistence with corruption fallback`

### Task 5 — Store, shell, styles

**Files:** `src/lib/game/game.svelte.ts`, `src/lib/game/speech.ts`, `src/lib/game/sounds.ts`, `src/lib/game/lines.ts`, `src/app.css`, `src/routes/+layout.svelte`, `src/app.html`

- [ ] Runes store: `game.state` + `actions.*` that apply a transition and persist; `reset()`; `speak`/sound hooks live in components, not the store
- [ ] `speech.ts`: `speak(text)` via `speechSynthesis`, cancelled/replaced per call, disabled by `?mute=1` or unsupported browsers
- [ ] `sounds.ts`: tiny WebAudio blips (coin, clunk, pop, chime, sad); `unlock()` on first tap; try/catch no-op
- [ ] `lines.ts`: every spoken line, name-interpolated, fallback "friend"
- [ ] Style: storybook-plush palette (cream/sky/grass/coral/sunny), Fredoka via `@fontsource/fredoka`, big touch targets, `overscroll-behavior:none`, no text selection
- [ ] `app.html`: manifest link, theme-color, `viewport-fit=cover`
- [ ] Commit: `feat: game store, voice, sounds, and app shell`

### Task 6 — Scenes

**Files:** `src/lib/components/*.svelte`, `src/routes/+page.svelte`

One component per phase, `$page` switches on `game.state.phase`; shared props (`Buddy.svelte`, `Coin.svelte`, `Jar.svelte`, `Bubble.svelte`, `HUD.svelte`, `HomeStrip.svelte`). `Buddy` carries `data-testid="buddy"` + `data-mood`. Each scene speaks its line on mount.

- [ ] `Setup` (`name-input`, `name-submit`, `name-skip`; reset mode: `reset-game-button`)
- [ ] `StartScreen` (`start-button`, `open-setup-button`), `Greeting` (`greeting-start`), auto-advance tidy→water, water→hunger
- [ ] `TaskTidy` (`toy-0..2` draggable via pointer events, `tidy-box` drop target; happy clunk per toy)
- [ ] `TaskWater` (`drop-0..2` taps; tree blooms)
- [ ] `Hunger` (`hunger-feed`, `hunger-skip`), `Friend` (`friend-give`, `friend-done`, swing planks visible)
- [ ] `Shelf` (`shelf-save` primary, `shelf-lollipop`, `lollipop-continue`), `Jars` (`jars-continue`), `GoalReached` (`goal-celebrate`), `GoalPick` (`goal-option-<id>`), `TuckIn` (`tuckin-done`, droopy iff `buddySad`)
- [ ] HUD shows `coin-count`, `jar-progress` ("n / 6"), day; `HomeStrip` shows `home-item-<id>` per earned Goal
- [ ] Commit: `feat: money day scenes`

### Task 7 — Playwright e2e

**Files:** `playwright.config.ts`, `e2e/helpers.ts`, `e2e/*.spec.ts`

- [ ] Config: `testDir: 'e2e'`, `webServer: { command: 'pnpm build && pnpm preview -- --port 4173 --strictPort', url: 'http://localhost:4173', reuseExistingServer: !CI }`, `baseURL` same
- [ ] Helper `beginDay(page)`: open `/?mute=1`, handle setup (fresh context per test = empty localStorage), start, greet, complete both tasks
- [ ] `first-run.spec.ts`: name entry → greeting shows name; reload → no setup again
- [ ] `money-day.spec.ts`: two-day skip-everything run → Goal celebration → pick next → home shows item, jar reset (Review Focus 2 + 3)
- [ ] `temptation.spec.ts`: buy lollipop → praise visible, jar gets remainder only; both choices never shamed
- [ ] `hunger.spec.ts`: skip feed → droopy tuck-in + droopy next greeting; feed next day → clears (ADR-0003)
- [ ] `sharing.spec.ts`: give 3 → swing complete; separate day give 0 → no penalty, reaches tuck-in
- [ ] `persistence.spec.ts`: reload after tuck-in keeps day/jar; Grown-up Setup reset wipes everything (Review Focus 4)
- [ ] Commit: `test: playthrough e2e suites`

### Task 8 — PWA manifest

- [ ] `static/manifest.webmanifest` + icons (SVG now; PNG rasterization is a polish task) + meta tags → installable "Add to Home Screen"
- [ ] Offline service worker explicitly deferred to polish (documented in this plan)
- [ ] Commit: `feat: installable web app manifest`

### Task 9 — Verification (evidence before claims)

- [ ] `pnpm check` (svelte-check), `pnpm test`, `pnpm build` all green
- [ ] `pnpm test:e2e` green against the production build
- [ ] Manual smoke: `pnpm preview` + curl `/` → 200 with app HTML
- [ ] Fix anything found, rerun, then final commit

## Deferred to the polish phase (conscious cuts, not omissions)

- Offline service worker (PWA caching)
- PNG app icons (192/512 + apple-touch)
- Buddy's final name/species, goal item art pass, a second Friend, temptation variety
- Real-voice recordings (decision: TTS-only forever; revisit only if wanted)

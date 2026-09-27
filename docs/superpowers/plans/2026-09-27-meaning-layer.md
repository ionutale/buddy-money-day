# Meaning Layer Implementation Plan

> **For agentic workers:** Executed natively in this session (OpenCode; this file's checkboxes are the tracker). Steps use `- [ ]`. Spec: `docs/superpowers/specs/2026-09-27-meaning-layer-design.md`.

**Goal:** Give every Money Day beat its **because → so → and-that's-why** grammar: a Goal banner that is always visible and animates on every money event, a morning plan with price tags, truthful coin flights (hand vs jar), a completion preview at the shelf, goal-state lines after spends, and honest tuck-in recaps.

**Architecture:** Presentation + voice only. The pure engine gains one transient flag (`goalCompletedToday`) and two pure helpers (`earnedToday`, `savePreview`); components consume a shared `GoalBanner`, a `CoinFlight` overlay, and a `Toast` for spoken lines. No economy, phase, or persistence-schema changes.

**Tech Stack:** existing (Svelte 5 runes, SvelteKit static SPA, vitest, Playwright).

**Spec:** `docs/superpowers/specs/2026-09-27-meaning-layer-design.md`

## Global Constraints

- All existing `data-testid`s and text contracts preserved (`jar-progress` keeps "n / 6"; `coin-count` keeps the number). The 15 existing e2e specs must pass **unmodified**.
- No new persisted state; `schemaVersion` stays 1; old saves load safely (missing flag reads as false).
- Voice lines come from `lines.ts` only; every visible bubble/toast mirrors its spoken line.
- Animations respect `prefers-reduced-motion` (app.css already collapses animations globally).
- Overlays never intercept pointer events (`pointer-events: none`) and never block scene advance (fallback timers).
- Gates per task: `pnpm check` + `pnpm test`; e2e additions run against the **production build** on the isolated preview (port 43117, never reused).

## Review Focus

1. **The preview never lies** — shelf preview shows exactly `jarCoins + coins` capped at 6, including overflow (5 + 3 → six lit, completion shown) without crashes.
2. **`goalCompletedToday` lifecycle** — set at `goalCelebrated`, survives through `pickGoal` to the tuck-in recap, cleared by `tuckInDone`/`resetDayTransients`, absent in old saves.
3. **Existing contracts** — the 15 old specs pass with zero edits (testids, texts, timing).
4. **Overlay safety** — coin flights/toasts are `pointer-events: none` and always complete (fallback timer even if `onDone` is lost).
5. **Honest spends** — spends never touch the jar, never go negative, and their lines never claim progress ("still has").

---

### Task 1 — Engine: `goalCompletedToday`, `earnedToday`, `savePreview`

**Files:** `src/lib/game/types.ts`, `src/lib/game/state.ts`, `src/lib/game/state.spec.ts`

- [ ] **Step 1: failing tests.** Add to `state.spec.ts`:
  - `goalCelebrated` sets `goalCompletedToday` true; `tuckInDone` clears it; `resetDayTransients` clears it; `newGame` starts false
  - `earnedToday`: fresh day 0 → after both tasks 3 → after `feedBuddy` still 3 → after tasks + lollipop-only day (craft state) 3; equals `coins + fed + gave + lollipop*2`
  - `savePreview`: `{jar 4, coins 3}` → `{filled: 6, completes: true}`; `{jar 5, coins 3}` → `{filled: 6, completes: true}` (overflow capped); `{jar 0, coins 0}` → `{filled: 0, completes: false}`
- [ ] **Step 2: run red** — `pnpm test` → expected: `earnedToday`/`savePreview` not exported; flag missing.
- [ ] **Step 3: implement.** In `types.ts` add `goalCompletedToday: boolean` (transient group). In `state.ts`:
  ```ts
  export function earnedToday(s: GameState): number {
    return s.coins + (s.fedToday ? FEED_COST : 0) + s.gaveToday + (s.lollipopToday ? LOLLIPOP_COST : 0);
  }
  export function savePreview(s: GameState): { filled: number; completes: boolean } {
    const total = s.jarCoins + s.coins;
    return { filled: Math.min(total, GOAL_COST), completes: total >= GOAL_COST };
  }
  ```
  `newGame` → `goalCompletedToday: false`; `goalCelebrated` → `+goalCompletedToday: true`; `tuckInDone`/`resetDayTransients` → `goalCompletedToday: false`.
- [ ] **Step 4: run green** — `pnpm test`.
- [ ] **Step 5: commit** — `feat: engine support for the meaning layer (completed-today flag, earnedToday, savePreview)`.

### Task 2 — Voice: shared generators in `lines.ts`

**Files:** `src/lib/game/lines.ts`, `src/lib/game/lines.spec.ts` (new)

- [ ] **Step 1: failing tests.** New `lines.spec.ts`:
  - `whereGoalStands`: jar 4 → "Your kite has 4 of 6."; jar 6 → "Your kite is yours!"; uses the current goal's label (hat → "funny hat")
  - `goalStillStands` (spends): "Your kite still has 4 of 6."
  - `recapLine` v1 when `goalCompletedToday` (names old goal from `homeItems` tail and the new goal)
  - v2 `jarCoins > 0`: "Today you earned 3 coins. Your kite has 3 of 6. 3 more and it's yours!"; `n === 1` → "One more and it's yours!"
  - v3 `jarCoins === 0`: "… Tomorrow we can earn more!"
  - `planLine`: "Today we can earn 3 coins for your kite!"
  - updated `tidy`/`water` opening lines contain the deal ("two coins" / "one coin")
- [ ] **Step 2: run red** — `pnpm test`.
- [ ] **Step 3: implement** the generators in `lines.ts` (keep existing keys; update `tidy`, `water`; add `planLine`, `tidyPaidGoal`, `waterPaidGoal`, `hungerSpent`, `friendGiveGoal`, `lollipopGoal`, `shelfComplete`, `recapLine`, `whereGoalStands`, `goalStillStands`). Spent/goal lines append/name `GOAL_LABELS[s.goal]` exactly as the spec's table.
- [ ] **Step 4: run green** — `pnpm test`.
- [ ] **Step 5: commit** — `feat: meaning-layer voice generators`.

### Task 3 — GoalBanner + HUD + StartScreen

**Files:** `src/lib/components/GoalBanner.svelte` (new), `HUD.svelte`, `StartScreen.svelte`, `e2e/meaning.spec.ts` (new)

- [ ] **Step 1: failing e2e.** Create `e2e/meaning.spec.ts` with test `the goal is always on screen`: fresh game → start screen shows `goal-banner` with 0 filled slots; begin a day → greeting shows the banner; after task earnings the slots are still empty (coins in hand) while `coin-count` is 3; jar progress text reads "0 / 6".
- [ ] **Step 2: run red** — `pnpm exec playwright test e2e/meaning.spec.ts -g "always on screen"` → `goal-banner` not found.
- [ ] **Step 3: implement.** `GoalBanner.svelte`: goal item (reuse `GoalItem`) + six slots `goal-slot-0..5` with `data-filled="true|false"`; props `{ preview?: number }` for Task 6. `HUD.svelte`: render `GoalBanner` left of the day badge, keep `coin-count`, keep `jar-progress` as small text. `StartScreen.svelte`: add `GoalBanner` above `HomeStrip`.
- [ ] **Step 4: run green** — the new test with `pnpm check` + `pnpm test`.
- [ ] **Step 5: commit** — `feat: goal banner — the Goal is always on screen`.

### Task 4 — CoinFlight + Toast primitives

**Files:** `src/lib/game/coins.svelte.ts` (new), `src/lib/game/coins.spec.ts` (new), `src/lib/game/toasts.svelte.ts` (new), `src/lib/components/CoinFlights.svelte` (new), `src/lib/components/Toasts.svelte` (new), `src/routes/+page.svelte`

**Interfaces (produced):**
```ts
flightSchedule(count: number): { delays: number[]; fallbackMs: number }
flyCoins(spec: { from: Point; to: Point; count?: number; onDone?: () => void }): void
toast(text: string): void
```

- [ ] **Step 1: failing unit (schedule math).** `coins.spec.ts`: `flightSchedule(1)` → delays `[0]`, fallback 600 ms; `flightSchedule(3)` → delays `[0, 90, 180]`, fallback 780 ms; delays strictly increasing. This pins Review Focus 4 ("a flight always completes even if onDone is lost").
- [ ] **Step 2: run red** — `pnpm test`.
- [ ] **Step 3: implement** the five files. Both overlays are `pointer-events: none`; the toast chip carries `data-testid="goal-toast"` and auto-dismisses after 2.4 s; `+page.svelte` mounts both overlays once. No further unit surface — visible behavior is pinned by Tasks 5/6 e2e.
- [ ] **Step 4: run green** — `pnpm test`.
- [ ] **Step 5: commit** — `feat: coin-flight and toast primitives`.

### Task 5 — Tasks: price tags, deals, earn flights, goal lines

**Files:** `TaskTidy.svelte`, `TaskWater.svelte`, `e2e/meaning.spec.ts`

- [ ] **Step 1: failing e2e** (extend `meaning.spec.ts`): `every task states its deal` — `task-tidy` shows `price-tag-tidy` and the opening bubble names the deal ("two coins"); completing tidy fires a `goal-toast` "Two coins earned!"; then `task-water` shows `price-tag-water`; completing water toasts "One coin earned!".
- [ ] **Step 2: run red.**
- [ ] **Step 3: implement.** Price badges (`price-tag-tidy` "2", `price-tag-water` "1", Coin icon). Opening lines = updated `lines.tidy`/`lines.water` (deal + reason). Payment moment: keep the existing pay-moment beat, add `flyCoins` from the payment spot to the top-left HUD counter, then advance (same 1.6 s window, flight ≤ 600 ms); on completion call `toast(lines.tidyPaid(...))`.
- [ ] **Step 4: run green** — targeted e2e + `pnpm check` + `pnpm test`.
- [ ] **Step 5: commit** — `feat: tasks state their reason, deal, and payoff`.

### Task 6 — Hunger, Friend, Shelf: spends state the goal; preview completes it

**Files:** `Hunger.svelte`, `Friend.svelte`, `Shelf.svelte`, `e2e/meaning.spec.ts`

- [ ] **Step 1: failing e2e:**
  - `a spend restates the goal`: day with tasks → feed → `goal-toast` visible containing "still has 0 of 6" and `jar-progress` still reads "0 / 6"
  - `the shelf previews the outcome`: day 1 save 3 → tuck; day 2 tasks (3 held) → shelf shows `shelf-preview` with `data-preview-filled="6"` and `data-complete="true"` + completion line; earlier in day, preview would be partial
  - `the lollipop spend restates the goal`: skip feed, buy lollipop → praise + `goal-toast` "still has 1 of 6"
- [ ] **Step 2: run red.**
- [ ] **Step 3: implement.** Hunger/friend openings per spec table; after `feedBuddy`/`giveCoin`, `flyCoins` hand → scene + `toast(lines.hungerSpent(s) / friendGiveGoal(s))`. Shelf: `shelf-preview` wrapper around `GoalBanner preview={jarCoins + coins}` with `data-preview-filled` and `data-complete`; save button label "Save for the kite"; completion line `lines.shelfComplete` shown in the preview when `data-complete`. Lollipop purchase appends `goalStillStands` after the praise line.
- [ ] **Step 4: run green.**
- [ ] **Step 5: commit** — `feat: spends restate the goal; shelf previews the outcome`.

### Task 7 — Bookends: plan, jars, goal-reached, goal-pick, recap

**Files:** `Greeting.svelte`, `Jars.svelte`, `GoalReached.svelte`, `GoalPick.svelte`, `TuckIn.svelte`, `e2e/meaning.spec.ts`

- [ ] **Step 1: failing e2e:**
  - `the morning plan speaks the whole deal`: greeting bubble contains "Today we can earn 3 coins for your kite!" and shows `plan-card-tidy` + `plan-card-water` with their coin badges
  - `the last coin fills the last slot`: two-day save run → goal-reached scene shows banner with six `data-filled="true"` slots and a `HomeStrip`-like shelf; after tuck-in, the start screen's Home shows the kite
  - `the new goal starts empty`: after `goal-option-hat`, the tuck-in banner shows 0 filled slots and the hat as the goal
  - `the recap tells the truth`: variants — completed-today (mentions old goal is yours + new goal), still-saving ("has 3 of 6"), spent-everything ("Tomorrow we can earn more")
- [ ] **Step 2: run red.**
- [ ] **Step 3: implement.** Greeting: plan cards (`plan-card-tidy`/`plan-card-water` with badges) + `lines.planLine` in the bubble. Jars: keep the big jar; bump one HUD slot per coin landing; speak `whereGoalStands` on finish. GoalReached: add a compact `HomeStrip` in-scene; final slot pop; item arcs from banner to the strip; the existing `goalReached` line. GoalPick: on tap, immediately `pickGoal` + speak "The {label} needs 6 coins!" (the banner shows the new empty goal). TuckIn: `recap-text` element with `lines.recapLine` (visible + spoken).
- [ ] **Step 4: run green** — targeted e2e + `pnpm check` + `pnpm test`.
- [ ] **Step 5: commit** — `feat: bookends — plan, goal celebration arc, honest recap`.

### Task 8 — Full verification

- [ ] `pnpm check` 0 errors; `pnpm test` all green (old + new units)
- [ ] `pnpm test:e2e` — **all 15 old specs unmodified + new `meaning.spec.ts`** pass against the production build (port 43117)
- [ ] `E2E_BASE_URL=https://buddy-money-day.vercel.app pnpm test:e2e` after push — deployed verification
- [ ] Fix anything found, rerun the full ladder, commit `test: verify the meaning layer end to end`

### Task 9 — Docs + ship

- [ ] Update `CONTEXT.md`: add **Plan** (the morning job board) and **Goal Banner** to the Language section
- [ ] Commit `docs: meaning-layer glossary terms`; push (auto-deploys)
- [ ] Verify the git-triggered deployment is Ready + live suite green; report

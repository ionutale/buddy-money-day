# Store & Play — Slice 1 Implementation Plan

> **For agentic workers:** Executed natively in this session (OpenCode; this file's checkboxes are the tracker). Steps use `- [ ]`. Spec: `docs/superpowers/specs/2026-09-27-store-and-play-design.md`.

**Goal:** Replace the game's core loop with **chores → coins → store → buy/save → play**, invert feeding into a paid job (care rewarded, never priced), delete the bird/lollipop/droop machinery, and ship the Ball mini-game — the vertical slice of the redesign.

**Architecture:** Engine v2 (state machine with a `chores` hub and a `store` phase, toy catalog, v1→v2 save migration) + re-pointed scenes (JobBoard, TaskFeed, Store, DreamReached) + a play mode (ToysRoom + MiniGameBall) living outside the engine as UI state. The meaning-layer primitives (banner, plan, price tags, toasts, flights, recap) are reused, re-pointed at the dream toy.

**Tech Stack:** existing — Svelte 5 runes, SvelteKit static SPA, vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-27-store-and-play-design.md`

## Global Constraints

- **The moral invariant (hard):** no code path may make the bear sad or persist hunger; skipping the feed chore has **zero** state consequences; feeding always pays.
- One currency; the jar is for the dream; buying is deliberate; saving remains the default path (ADR-0002).
- Chores: Tidy 2 · Water 1 · Feed 1; each **once per day**, in any order; store opens only when all three are done.
- Prices: Ball 2 · Car 4 · Blocks 6 · Wagon 12 · Teddy 12. Dream list `['wagon','teddy']`, **cycles** when all owned (no dead-ends).
- No new phases beyond: `setup | start | greeting | chores | task-tidy | task-water | task-feed | store | dream-reached | tuck-in`.
- Play mode writes nothing to the save; every mini-game is no-fail.
- All 4 surviving spec files (first-run, settings, persistence) stay green; deleted specs are listed per task; every deletion is explicit.
- Gates per task: `pnpm check` + `pnpm test`; e2e additions run against the **production build** via a manual preview on `127.0.0.1:43118` with `E2E_BASE_URL` (this machine's Playwright webServer management is flaky — see earlier session notes).

## Review Focus

1. **Migration safety** — a v1 save keeps `childName`, `day`, `jarCoins`; dream becomes `wagon`; `owned` empty; corrupt/unknown saves still boot fresh (test in T2 + e2e seed in T10).
2. **Money conservation** — no tap sequence can make `coins`/`jarCoins` negative; buy only from `store` for unowned, affordable `toy`-kind items; dream completes exactly at ≥ price, remainder kept, repeats cycle (tests in T1).
3. **Chore cap semantics** — each chore exactly once per day, any order; `toStore` guarded by `allChoresDone`; cap line only then (tests in T1 + T5 e2e).
4. **The moral invariant** — after this slice, grep finds no `buddySad|skipFeed|hungerNoCoin|tuckInSad|greetingSad|lollipop`; skipping feed changes nothing (unit test: skip → tuck-in state equals fed-day state minus 1 coin) (T1 + T10 audit).
5. **Play-room safety** — tap-spam on the ball never throws or ends the game; exit always visible; a full play session mutates no storage (e2e asserts localStorage unchanged after play) (T9).

---

### Task 1 — Engine v2: catalog, phases, chores hub, store, dream cycle

**Files:** `src/lib/game/economy.ts`, `src/lib/game/types.ts`, `src/lib/game/state.ts`, `src/lib/game/state.spec.ts`

**Interfaces (produced):**
```ts
// economy.ts
export const FEED_REWARD = 1;                       // FEED_COST, LOLLIPOP_COST, SWING_PLANKS, GOAL_COST, GOALS, GOAL_LABELS deleted
export const TOYS = ['ball','car','blocks','wagon','teddy'] as const;
export type ToyId = (typeof TOYS)[number];
export const TOY_PRICES: Record<ToyId, number>;      // ball 2, car 4, blocks 6, wagon 12, teddy 12
export const TOY_KIND: Record<ToyId, 'toy'|'dream'>; // wagon, teddy are dreams
export const TOY_LABELS: Record<ToyId, string>;      // "ball", "car", "blocks", "big red wagon", "big teddy"
export const DREAMS = ['wagon','teddy'] as const;

// types.ts — SCHEMA_VERSION = 2; Phase adds 'chores','task-feed','store','dream-reached'; removes 'hunger','friend','shelf','jars','goal-reached','goal-pick'
// GameState keeps: childName, nameSkipped, day, goal (= current dream ToyId), jarCoins, savedToday
//                 adds: owned: ToyId[], earnedTodayCoins: number; renames goalCompletedToday -> dreamCompletedToday
//                 removes: homeItems, planks, buddySad, lollipopsTotal, gaveToday, lollipopToday
```

**Function changes:** `greetDone → 'chores'`; new `openTidy/openWater/openFeed` (guarded by phase `'chores'` and not-already-done) each entering its task phase; `tidyToy`/`waterDrop` pay and return to `'chores'` on completion; new `feedBear` (guard `'task-feed'`, pays `FEED_REWARD`, sets `fedToday`, → `'chores'`); `allChoresDone(s)`; `toStore(s)` (guard); `buyToy(s,id)` (guard: phase `'store'`, kind `'toy'`, unowned, `coins >= price`); `saveRemainder(s)` (jar += coins, savedToday += coins, coins = 0); `storeDone(s)` (jar ≥ `TOY_PRICES[s.goal]` → `'dream-reached'` else `'tuck-in'`); `dreamCelebrated(s)` (sets `dreamCompletedToday`, pushes `goal` into `owned`, jar −= price, `goal = nextDream(owned)`, → `'tuck-in'`); `nextDream(owned)` = first `DREAMS` not owned else `DREAMS[0]`; `earnedToday(s) = s.earnedTodayCoins`; `savePreview` uses the dream's price. Every chore payment increments `earnedTodayCoins`. `resetDayTransients` zeroes all transients incl. `earnedTodayCoins`, `dreamCompletedToday`. Deleted: `skipFeed`, `giveCoin`, `friendDone`, `buyLollipop`, `continueAfterLollipop`, `jarsDone`, `goalCelebrated`, `pickGoal`, `nextGoalOptions`.

- [ ] **Step 1: failing tests.** In `state.spec.ts` (rework the file's helpers to v2: `freshDay` unchanged shape; `withTasks` → `doAllChores` doing tidy+water+feed in any order): chores pay and return to the hub; out-of-order chores work; feed pays and never saddens (no `buddySad` exists — assert the state shape has no sad field by construction); `allChoresDone` gating; `toStore` guarded; `buyToy` success/deny (unowned, affordable, kind, phase); `saveRemainder`/`storeDone` at 11/12/13; `dreamCelebrated` completes, keeps remainder, cycles (`owned: all` → next dream = `DREAMS[0]`); `earnedTodayCoins`; **skip-feed invariance** (a day with feed skipped differs from a fed day *only* by 1 coin and `fedToday`).
- [ ] **Step 2: run red** — `pnpm test`.
- [ ] **Step 3: implement** the three files per the interfaces above.
- [ ] **Step 4: run green** — `pnpm test`.
- [ ] **Step 5: commit** — `feat: engine v2 — chores hub, feed pays, store, dream cycle`.

### Task 2 — Persistence v2 + v1 migration

**Files:** `src/lib/game/persistence.ts`, `src/lib/game/persistence.spec.ts`

- [ ] **Step 1: failing tests.** v2 roundtrip incl. `owned`; **v1 fixture** (the exact shape committed in commit `e55b4b8`-era saves) migrates: `childName`/`day`/`jarCoins` kept, dream `wagon`, `owned: []`, phase `start`; unknown version → fresh; corrupt → fresh.
- [ ] **Step 2: red → implement → green.**
  ```ts
  function migrateV1(v1: Record<string, unknown>): GameState {
    const base = newGame();
    return { ...base,
      childName: typeof v1.childName === 'string' ? v1.childName : '',
      nameSkipped: v1.nameSkipped === true,
      day: typeof v1.day === 'number' && v1.day >= 1 ? v1.day : 1,
      jarCoins: typeof v1.jarCoins === 'number' && v1.jarCoins >= 0 ? v1.jarCoins : 0 };
  }
  ```
- [ ] **Step 3: commit** — `feat: save schema v2 with v1 migration`.

### Task 3 — Lines v2

**Files:** `src/lib/game/lines.ts`, `src/lib/game/lines.spec.ts`

- [ ] **Step 1: failing tests** for the new wording (pin exact strings): `planLine` ("Today we can earn 4 coins for your big red wagon!"), `capLine` ("All chores done! More tomorrow."), `feed`/`feedPaid`, `store`/`storeSave`/`storeUnaffordable` ("That's 6 coins — you have 4. Two more chores tomorrow!"), `dreamReached`, `dreamProgress` ("Your big red wagon has 7 of 12."), `dreamStillStands`, `recapLine` variants (completed-today via `owned` tail; still-saving with `earnedTodayCoins`; nothing saved), `toysRoomEmpty` ("No toys yet! Do chores, then visit the store."). Delete the friend/lollipop/hunger/`goalPick` line keys and their tests.
- [ ] **Step 2: red → implement → green.**
- [ ] **Step 3: commit** — `feat: voice v2 — chores, store, dream, and the cap line`.

### Task 4 — Banner & dream art

**Files:** `src/lib/components/GoalBanner.svelte`, `src/lib/components/GoalItem.svelte`, `src/lib/game/banner.svelte.ts`

- [ ] **Step 1:** `GoalBanner` slots = the dream's price (12), laid out **two rows of six**, still `goal-slot-*` + `data-filled`, `jar-progress` text now "n / 12"; preview prop unchanged.
- [ ] **Step 2:** `GoalItem` gains **wagon** and **teddy** art (storybook style, matching the existing palette/line weight); remove kite/hat/slide kinds.
- [ ] **Step 3:** `pnpm check` + unit tests green (no line/spec churn expected beyond above).
- [ ] **Step 4: commit** — `feat: dream banner (12 slots, two rows) and wagon/teddy art`.

### Task 5 — JobBoard + Greeting (chores hub) + chores e2e

**Files:** `src/lib/components/JobBoard.svelte` (new), `Greeting.svelte`, `e2e/chores.spec.ts` (new), `e2e/helpers.ts` (chore helpers)

- [ ] **Step 1: failing e2e** (`chores.spec.ts`, run against the dev server loop first): "jobs can be done in any order" (feed → water → tidy, each pays, cards check off); "the cap line appears only when all three are done" (`cap-line` + `to-store-button` gated). Helpers: `doChore(page,'tidy'|'water'|'feed')` (tidy = existing drags; water = taps; feed = `feed-give` click).
- [ ] **Step 2: red → implement.** `JobBoard`: three cards (`job-card-tidy|water|feed`) with price badges (`price-tag-*` kept), checkmarks, `cap-line`, `to-store-button`. `Greeting`: keep the plan line in the bubble; the cards move out (board is the next scene).
- [ ] **Step 3: green + commit** — `feat: the job board — pick a chore, any chore`.

### Task 6 — TaskFeed (delete Hunger)

**Files:** `src/lib/components/TaskFeed.svelte` (new), delete `Hunger.svelte`, `e2e/chores.spec.ts`

- [ ] **Step 1: failing e2e:** feeding pays: cap 0→1 coin, toast "…one coin earned", bear mood happy after, returns to the board; **no skip button exists** (`hunger-skip` count 0).
- [ ] **Step 2: red → implement** as a re-skin of the snack beat with one `feed-give` action, no cost, no skip.
- [ ] **Step 3: green + commit** — `feat: feeding is a paid job — care rewarded, never priced`.

### Task 7 — Store (delete Shelf, Jars, GoalPick)

**Files:** `src/lib/components/Store.svelte` (new), delete `Shelf.svelte`, `Jars.svelte`, `GoalPick.svelte`, `e2e/store.spec.ts` (new)

- [ ] **Step 1: failing e2e:** unaffordable compare (`store-unaffordable` "That's 6 coins — you have 4…" with 4 coins vs blocks); buy the ball with 2 → celebration → `store-toy-ball` state owned; save-remainder flies coins to the banner and advances (to tuck-in, or to dream-reached at ≥12); dream pedestal (`store-dream`) shows brick progress.
- [ ] **Step 2: red → implement.** Store = shelf (`store-shelf`, `store-toy-ball`) + dream pedestal (`store-dream`) + default `store-save-button` ("Save the rest for your big red wagon"). Buying celebrates and restates the dream (`dreamStillStands` toast). The save beat replaces the jars scene: coins fly to the banner, slots pop, then `storeDone`.
- [ ] **Step 3: green + commit** — `feat: the store — buy a toy or save for the dream`.

### Task 8 — DreamReached + title screen strip + TuckIn recap

**Files:** `src/lib/components/DreamReached.svelte` (new; delete `GoalReached.svelte` in this task), `StartScreen.svelte`, `TuckIn.svelte`, delete `HomeStrip.svelte` (replaced inline), `e2e/meaning.spec.ts` (re-point)

- [ ] **Step 1: failing e2e:** three days of pure saving reach 12 → `dream-celebrate` → caption names the wagon → recap v1 ("The big red wagon is yours…") → title screen shows `owned-strip` with `owned-toy-wagon`.
- [ ] **Step 2: red → implement.** Reuse the arc-to-shelf moment (strip shows the new dream next); TuckIn speaks/shows `recapLine` only (no sad variant); StartScreen gains the `toys-door` ("My Toys") + owned strip.
- [ ] **Step 3: green + commit** — `feat: the dream comes home`.

### Task 9 — Toys room + Ball mini-game

**Files:** `src/lib/components/ToysRoom.svelte`, `src/lib/components/MiniGameBall.svelte` (both new), `StartScreen.svelte`, `e2e/playroom.spec.ts` (new)

- [ ] **Step 1: failing e2e:** empty room says `toys-empty`; after buying the ball, `toy-ball` appears; tap → `mini-game-ball`; three taps → `data-bounces="3"`; `mini-game-exit` returns; **localStorage unchanged throughout** (Review Focus 5).
- [ ] **Step 2: red → implement.** `MiniGameBall`: ball falls on a CSS loop; each tap re-launches it (squish + *boing* via `sounds`), sparkle count grows; no score, no fail. Room and game are pure UI state on StartScreen (no engine).
- [ ] **Step 3: green + commit** — `feat: my toys room and the keepy-uppy ball`.

### Task 10 — Deletions sweep + spec rework

**Files:** delete `e2e/hunger.spec.ts`, `e2e/sharing.spec.ts`, `e2e/temptation.spec.ts`; rework `e2e/money-day.spec.ts`, `e2e/meaning.spec.ts`, `e2e/persistence.spec.ts`, `e2e/helpers.ts`; delete `Friend.svelte` and the friend/lollipop lines

- [ ] **Step 1:** rework `money-day.spec.ts` → "three days of saving reach the dream" (4/day, day 3 hits 12) + the coins-don't-survive-night test.
- [ ] **Step 2:** re-point `meaning.spec.ts` (banner 12 slots; job board; feed deal; store restates the dream; cap line; recap variants; last coin fills the last slot → wagon lands in the owned strip).
- [ ] **Step 3:** `persistence.spec.ts` gains the **e2e v1→v2 migration** (seed a v1 JSON in localStorage via `addInitScript`, reload, assert name/day/jar kept + wagon banner + empty room) and owned-toys roundtrip.
- [ ] **Step 4:** deletions audit (Review Focus 4): `grep -rn "buddySad|skipFeed|hungerNoCoin|tuckInSad|greetingSad|lollipop|Friend|planks" src e2e` returns only historical docs; **remove the unused `sad` mood from `Buddy.svelte`** (mood set: happy/hungry/sleepy/celebrate).
- [ ] **Step 5: commit** — `test: rework the suites for the store loop; delete dead specs`.

### Task 11 — Full verification

- [ ] `pnpm check` 0 errors; `pnpm test` all green.
- [ ] `pnpm build` + manual preview on `127.0.0.1:43118`; **full Playwright run against the production build** (`E2E_BASE_URL=http://127.0.0.1:43118`) — all specs (reworked + first-run + settings + persistence + chores + store + playroom + meaning + money-day) green.
- [ ] Fix anything found; rerun; commit — `test: verify the store slice end to end`.

### Task 12 — Docs + ship

- [ ] `docs/adr/0006-work-save-buy-play.md` (records: loop change, feed inversion, daily caps, droop consequence retired, ADR-0003's principle retained); `CONTEXT.md` updates (**Dream toy** replaces Goal; **Store**, **My Toys**, feed-as-job; remove Bird/Hunger/Temptation); README refreshed (describe the store loop; settings note unchanged).
- [ ] Commit `docs: store & play — ADR-0006, glossary, README`; push (auto-deploys); verify the deployment is Ready and run the **full suite against the live URL**; report.

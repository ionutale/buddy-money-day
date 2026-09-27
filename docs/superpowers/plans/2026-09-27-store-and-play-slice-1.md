# Store & Play — Slice 1 Implementation Plan

> **For agentic workers:** Executed **subagent-driven** (fresh implementer per task, task review after each, whole-branch review at the end). This file's checkboxes are the tracker. Steps use `- [ ]`. Spec: `docs/superpowers/specs/2026-09-27-store-and-play-design.md`.
>
> **Tracker note:** Executed subagent-driven; the live tracker was the SDD ledger (`.superpowers/sdd/2026-09-27-store-and-play-slice-1/progress.md`) — checkboxes left unticked.

**Goal:** Replace the game's core loop with **chores → coins → store → buy/save → play**, invert feeding into a paid job (care rewarded, never priced), delete the bird/lollipop/droop machinery, and ship the Ball mini-game — the vertical slice of the redesign.

**Architecture:** Engine v2 (state machine with a `chores` hub and a `store` phase, toy catalog, v1→v2 save migration) + re-pointed scenes (JobBoard, TaskFeed, Store, DreamReached) + a play mode (ToysRoom + MiniGameBall) living outside the engine as UI state. The meaning-layer primitives (banner, plan, price tags, toasts, flights, recap) are reused, re-pointed at the dream toy.

**Tech Stack:** existing — Svelte 5 runes, SvelteKit static SPA, vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-27-store-and-play-design.md`

## Global Constraints

- **The moral invariant (hard):** no code path may make the bear sad or persist hunger; skipping the feed chore has **zero** state consequences; feeding always pays.
- One currency; the jar is for the dream; buying is deliberate; saving remains the default path (ADR-0002).
- Chores: Tidy 2 · Water 1 · Feed 1; each **once per day**, in any order; store opens only when all three are done.
- Prices: Ball 2 · Car 4 · Blocks 6 · Wagon 12 · Teddy 12. Dream list `['wagon','teddy']`, **cycles** when all owned (no dead-ends).
- Phases: `setup | start | greeting | chores | task-tidy | task-water | task-feed | store | dream-reached | tuck-in`.
- Play mode writes nothing to the save; every mini-game is no-fail.
- Gates per task: `pnpm check` + `pnpm test` green; e2e additions run against a manually-run **dev server** on `127.0.0.1:43118` via `E2E_BASE_URL` (never start Playwright's own webServer on this machine — it is unreliable here); full production-build verification happens in the final tasks.
- **Interim spec rot is expected and contained:** between Task 1 (which deletes beats) and Task 9 (which reworks specs), several e2e specs are stale. Implementers run only their own targeted specs; the full suite is restored in Task 9 and verified in Task 10.

## Review Focus

1. **Migration safety** — a v1 save keeps `childName`, `day`, `jarCoins`; dream becomes `wagon`; `owned` empty; corrupt/unknown saves still boot fresh (T1 units + Task 9 e2e seed).
2. **Money conservation** — no tap sequence can make `coins`/`jarCoins` negative; buy only from `store` for unowned, affordable `toy`-kind items; dream completes exactly at ≥ price, remainder kept, dream list cycles (T1 units).
3. **Chore cap semantics** — each chore exactly once per day, any order; `toStore` guarded by `allChoresDone`; cap line only then (T1 units + T2 e2e).
4. **The moral invariant** — after this slice, grep finds no `buddySad|skipFeed|hungerNoCoin|tuckInSad|greetingSad|lollipop`; skipping feed changes nothing (T1 skip-feed invariance test + Task 9 audit; `Buddy.svelte`'s unused `sad` mood removed).
5. **Play-room safety** — tap-spam on the ball never throws or ends the game; exit always visible; a full play session mutates no storage (Task 8 e2e asserts localStorage unchanged).

---

### Task 1 — Demolition + foundation (one coherent breaking change)

**Why this is one task:** removing engine functions (bird, lollipop, hunger economy, old phases) breaks their consumers; deleting dead beats, writing engine v2, and patching the survivors must land together or nothing compiles. Interim placeholder scenes keep the app runnable while Tasks 3–8 replace them.

**Files:**
- Rewrite: `src/lib/game/economy.ts`, `src/lib/game/types.ts`, `src/lib/game/state.ts`, `src/lib/game/persistence.ts`, `src/lib/game/lines.ts`
- Delete: `src/lib/components/Friend.svelte`, `Hunger.svelte`, `Shelf.svelte`, `Jars.svelte`, `GoalReached.svelte`, `GoalPick.svelte`, `HomeStrip.svelte`; `e2e/sharing.spec.ts`, `e2e/temptation.spec.ts`, `e2e/hunger.spec.ts`
- Patch: `src/routes/+page.svelte` (phase switch), `Greeting.svelte`, `TaskTidy.svelte`, `TaskWater.svelte`, `TuckIn.svelte`, `StartScreen.svelte`, `HUD.svelte`, `GoalBanner.svelte`, `GoalItem.svelte`, `Buddy.svelte` (drop the `sad` mood)
- New (temporary placeholders, replaced in Tasks 2–7): `src/lib/components/JobBoard.svelte`, `TaskFeed.svelte`, `Store.svelte`, `DreamReached.svelte` — minimal but running (correct testids for their future e2e, plain visuals)
- Tests: `src/lib/game/state.spec.ts`, `persistence.spec.ts`, `lines.spec.ts` reworked to v2

**Interfaces (produced):**
```ts
// economy.ts
export const FEED_REWARD = 1;                        // FEED_COST/LOLLIPOP_COST/SWING_PLANKS/GOAL_COST/GOALS/GOAL_LABELS deleted
export const TOYS = ['ball','car','blocks','wagon','teddy'] as const;
export type ToyId = (typeof TOYS)[number];
export const TOY_PRICES: Record<ToyId, number>;      // ball 2, car 4, blocks 6, wagon 12, teddy 12
export const TOY_KIND: Record<ToyId, 'toy'|'dream'>;
export const TOY_LABELS: Record<ToyId, string>;
export const DREAMS = ['wagon','teddy'] as const;

// types.ts — SCHEMA_VERSION = 2
// GameState: childName, nameSkipped, day, goal (current dream ToyId), jarCoins, owned: ToyId[], savedToday,
//            phase, coins, tidyDone, waterDone, fedToday, earnedTodayCoins, dreamCompletedToday
// removed: homeItems, planks, buddySad, lollipopsTotal, gaveToday, lollipopToday, goalCompletedToday
```

**Engine API:** `beginDay → greeting`; `greetDone → 'chores'`; `openTidy/openWater/openFeed` (guard `'chores'`, not-done) → task phases; task completions pay (`TIDY_REWARD/WATER_REWARD/FEED_REWARD`), increment `earnedTodayCoins`, set flags, → `'chores'`; `allChoresDone`; `toStore` (guarded) → `'store'`; `buyToy(s,id)` (guard: store, `TOY_KIND[id]==='toy'`, unowned, affordable); `saveRemainder` (jar+=coins, savedToday+=coins, coins=0); `storeDone` (jar ≥ `TOY_PRICES[s.goal]` → `'dream-reached'` else `'tuck-in'`); `dreamCelebrated` (set `dreamCompletedToday`, `owned.push(goal)`, jar−=price, `goal = nextDream(owned)`, → `'tuck-in'`); `nextDream(owned)` = first `DREAMS` not owned else `DREAMS[0]`; `earnedToday(s) = s.earnedTodayCoins`; `savePreview` uses the dream's price; `resetDayTransients` zeroes all transients. Deleted: `skipFeed, giveCoin, friendDone, buyLollipop, continueAfterLollipop, jarsDone, goalCelebrated, pickGoal, nextGoalOptions`.

**Steps:**
- [ ] **Step 1: failing unit tests** in the three spec files: chores pay / any order / once; feed pays and day-without-feed differs only by one coin and `fedToday`; `allChoresDone`/`toStore` gating; `buyToy` success+deny matrix; `saveRemainder`/`storeDone` at 11/12/13; `dreamCelebrated` completes + remainder + cycles; `earnedTodayCoins`; v2 roundtrip + **v1 fixture migration** (keep `childName/day/jarCoins`, dream `wagon`, `owned []`); corrupt/unknown → fresh.
- [ ] **Step 2: run red** — `pnpm test`.
- [ ] **Step 3: implement** the pure layer; delete the dead beats and stale specs; patch survivors; create the four placeholder scenes with their future testids (plain visuals, correct wiring); `Buddy.svelte` loses the `sad` mood.
- [ ] **Step 4: green gates** — `pnpm check` 0 errors + `pnpm test`.
- [ ] **Step 5: commit** — `feat!: engine v2 — chores hub, paid feeding, store, dream cycle`.

### Task 2 — Voice off by default

**Files:** `src/lib/game/settings.ts`, `src/lib/game/settings.spec.ts`, `e2e/settings.spec.ts`, `README.md`

The product default flips: new installs are **silent**; the existing Voice switch in Grown-up Setup turns voice on (text bubbles already mirror every spoken line). A stored preference always wins over the default.

- [ ] **Step 1: failing unit tests.** In `settings.spec.ts`: the default is `{ voiceEnabled: false, voiceURI: null }`; a stored `voiceEnabled: true` still loads as true; the fallback paths (corrupt json, foreign shapes, broken storage) return the silent default.
- [ ] **Step 2: red → implement** (`DEFAULT_SETTINGS.voiceEnabled = false`).
- [ ] **Step 3: rework `e2e/settings.spec.ts`** (dev server, usual pattern): the default shows the toggle OFF and nothing is spoken; turning it ON speaks and persists across reload; the actor picker appears only while voice is on (pick → sticks across reload → System default restores); "Start over" keeps the choice. RED first: run the existing spec against the flipped default and capture the failures, then fix.
- [ ] **Step 4: README** — replace "fully-voiced" marketing with the truth: voice is optional, off by default, enabled in Grown-up Setup; bubbles carry all words.
- [ ] **Step 5: green gates** (`pnpm check`, `pnpm test`, targeted e2e) **+ commit** — `feat: voice off by default; grown-ups switch it on`.

### Task 3 — Job board + greeting

**Files:** `src/lib/components/JobBoard.svelte` (real), `Greeting.svelte`, `e2e/helpers.ts`, `e2e/chores.spec.ts` (new)

- [ ] **Step 1: failing e2e** (dev server at `E2E_BASE_URL=http://127.0.0.1:43118`): jobs in any order (feed → water → tidy), each pays and checks its card (`job-card-tidy|water|feed`, price badges kept); `cap-line` + `to-store-button` appear only when all three are done.
- [ ] **Step 2: red → implement.** Helper `doChore(page, 'tidy'|'water'|'feed')` (tidy = existing drags; water = taps; feed = the placeholder's `feed-give` action in this task — Task 4 replaces it with three snack drags and updates this helper and spec). Greeting keeps the plan line, cards move to the board.
- [ ] **Step 3: green + commit** — `feat: the job board — pick a chore, any chore`.

### Task 4 — Feed the bear (real scene): three snack drags

**Files:** `src/lib/components/TaskFeed.svelte`, `e2e/chores.spec.ts`, `e2e/helpers.ts`

- [ ] **Step 1: failing e2e:** three snack drags (`feed-snack-0..2`) into the bowl (`bear-bowl`): each bite munches, squishes, and raises the bear's mood; the third pays (0→1 coin, toast "…one coin earned", happy dance, back to the board); **no skip exists** (`hunger-skip` count 0); re-dragging an accepted snack is a no-op.
- [ ] **Step 2: red → implement.** Reuse TaskTidy's pointer-drag pattern (capture, center-in-target check, accepted flags, double-accept guard). Three berries (one small SVG reused), `feed-snack-{i}` testids; the completion pays via `feedBear` after the same 1.6s celebration rhythm as tidy/water; no cost, no skip.
- [ ] **Step 3: helpers** — `doChore(page, 'feed')` becomes three drags to `bear-bowl`.
- [ ] **Step 4: green + commit** — `feat: feed the bear — three bites, big payoff`.

### Task 5 — Tidy variety: a pool of six, three per day

**Files:** `src/lib/game/tidyPool.ts` (new), `src/lib/game/tidyPool.spec.ts` (new), `src/lib/components/TaskTidy.svelte`, `e2e/chores.spec.ts`

- [ ] **Step 1: failing unit tests.** `TIDY_POOL` has six kinds (ball, blocks, teddy, drum, boat, robot); `pickTidyToys(day)` returns three **distinct** kinds; **deterministic** for a given day (a reload mid-day shows the same trio); varies across days (at least two different sets within any 7-day run); every kind is from the pool.
- [ ] **Step 2: red → implement.** Pure seeded pick in `tidyPool.ts` (the day number is the seed — no engine state, no schema change); `TaskTidy` renders that day's trio, keeps the `toy-0..2` index testids and all existing drag/accept logic unchanged; draw three new toys (drum, boat, robot) in the storybook style.
- [ ] **Step 3: green + commit** — `feat: a fresh trio of toys to tidy every day`.

### Task 6 — The store (real scene)

**Files:** `src/lib/components/Store.svelte`, `e2e/store.spec.ts` (new)

- [ ] **Step 1: failing e2e:** buy ball with 2 → celebration → owned state; `store-save-button` flies coins to the banner's dream slots then advances (tuck-in, or dream-reached at ≥12); `store-dream` pedestal with progress. (`store-unaffordable` has no play path in v2 — the store opens only after all three chores (4 coins), the ball costs 2, and day transients never survive a load, so nothing can put the child at the shelf with 1 coin. Keep the branch and testid; its copy stays unit-covered in `lines.spec.ts`; e2e coverage defers to slice 2 when Blocks (6) joins the shelf.)
- [ ] **Step 2: red → implement.** Shelf (`store-shelf`, `store-toy-ball`) + pedestal + default save button; buys restate the dream via toast; the save-flight lands on the banner's dream slots, not the HUD counter (Task 1 parked fix).
- [ ] **Step 3: green + commit** — `feat: the store — buy a toy or save for the dream`.

### Task 7 — Dream home + title doors + recap

**Files:** `src/lib/components/DreamReached.svelte` (real), `StartScreen.svelte`, `TuckIn.svelte`, `e2e/meaning.spec.ts` (re-point, part 1)

- [ ] **Step 1: failing e2e:** three saving days reach 12 → `dream-celebrate` → recap v1 names the wagon → title shows `owned-strip` + `owned-toy-wagon`; `toys-door` exists on the title.
- [ ] **Step 2: red → implement.** Arc-to-strip reused; TuckIn speaks/shows `recapLine` only; StartScreen owns the "My Toys" door.
- [ ] **Step 3: green + commit** — `feat: the dream comes home`.

### Task 8 — Dream banner (12 slots) + wagon/teddy art

**Files:** `GoalBanner.svelte`, `GoalItem.svelte`

- [ ] `GoalBanner`: slots = dream price (12), two rows of six, `goal-slot-*`/`data-filled` kept, `jar-progress` "n / 12" derived from price; `GoalItem`: wagon + teddy art (storybook style), old kinds deleted; placeholders replaced.
- [ ] `pnpm check` + unit + targeted e2e green; commit — `feat: dream banner and wagon/teddy art`.

### Task 9 — Toys room + keepy-uppy ball

**Files:** `src/lib/components/ToysRoom.svelte`, `MiniGameBall.svelte` (new), `StartScreen.svelte`, `e2e/playroom.spec.ts` (new)

- [ ] **Step 1: failing e2e:** empty room shows `toys-empty`; after buying the ball, `toy-ball` appears; tap → `mini-game-ball`; three taps → `data-bounces="3"`; `mini-game-exit` returns; **localStorage unchanged** through it all.
- [ ] **Step 2: red → implement.** Pure UI state on StartScreen; no-fail ball loop (tap relaunch, squish, boing, sparkles).
- [ ] **Step 3: green + commit** — `feat: my toys room and the keepy-uppy ball`.

### Task 10 — Deletions audit + full spec rework

**Files:** `e2e/money-day.spec.ts`, `e2e/meaning.spec.ts`, `e2e/persistence.spec.ts`, `e2e/helpers.ts`; source cleanups

- [ ] Rework `money-day.spec.ts`: three saving days reach the dream; coins don't survive the night.
- [ ] Re-point `meaning.spec.ts`: banner 12 slots; job board; feed deal; store restates the dream; cap line; recap variants; last coin fills the last slot → wagon in the strip.
- [ ] `persistence.spec.ts`: **e2e v1→v2 migration** (seed v1 JSON via `addInitScript`, reload, assert name/day/jar kept + wagon banner + empty room) + owned-toys roundtrip.
- [ ] Audit greps (Review Focus 4) + remove dead helper code; delete any remaining dead source.
- [ ] **All specs green against the dev server** (the first full-suite run since Task 1) + commit — `test: rework the suites for the store loop`.

### Task 11 — Full verification

- [ ] `pnpm check` + `pnpm test` green.
- [ ] `pnpm build` + manual preview on `127.0.0.1:43118`; **full Playwright run against the production build** (`E2E_BASE_URL=http://127.0.0.1:43118`), all specs green.
- [ ] Fix anything found; commit — `test: verify the store slice end to end`.

### Task 12 — Docs + ship

- [ ] `docs/adr/0006-work-save-buy-play.md`; `CONTEXT.md` (**Dream toy**, **Store**, **My Toys**, feed-as-job; remove Bird/Hunger/Temptation); README refresh.
- [ ] Commit `docs: store & play — ADR-0006, glossary, README`; push; verify the deployment is Ready; run the **full suite against the live URL**; report.

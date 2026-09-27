# Meaning Layer — Design

**Status:** approved in conversation (2026-09-27); awaiting written-spec review
**Extends:** the prototype defined in `CONTEXT.md` and `docs/adr/*` (all ADRs hold)

## Problem

Playtest feedback (the parent): *"The game does not make sense. I am playing, but what is the reason for each thing I do? I expect: I do this, so I will achieve this."*

The mechanics work, but actions state no deal and no reason, and coin changes never visibly land on the thing being saved for. The missing grammar is:

> **because** (why the world needs it) → **so** (what you get) → **and that's why** (where it puts you toward the Goal)

## Goal

Every beat of a Money Day answers, without reading:

1. What am I doing? — 2. Why? — 3. What do I get? — 4. How close am I to the Goal?

## Non-goals

- The "wish" scene (Buddy spotting the kite) and the kite actually flying — deferred to follow-up B.
- Economy changes, new phases, new **persisted** state, new ADR-level decisions. All ADRs hold (no interest mechanic, default-to-jar, gentle consequences, static client-side).
- Any change to the loop order or session shape.

## Design

### 1. Goal banner — the Goal is always on screen

The HUD (all in-day scenes) and the start screen show a banner: the current Goal's picture + **six coin slots** (`GOAL_COST`), filled per saved coin, next to the hand-coin counter.

```
🪙 3        🪁 ●●●○○○        Day 2
```

The existing `jar-progress` text ("n / 6") stays, visually small, for parents and tests.

### 2. Morning plan (greeting)

The greeting adds today's plan: two picture cards with price tags, and one spoken deal.

- Cards: tidy (badge `2`) and water (badge `1`) — drawn with the same icons as the tasks.
- Voice: *"Good morning, Sam! Today we can earn three coins for your kite!"*

### 3. Every beat's grammar

Each beat opens with its **reason**, states its **deal**, and ends with a **goal-state line**. Canonical examples:

| Beat | Reason + deal (voice + bubble) | Payoff |
|---|---|---|
| Tidy | "Look at this mess! Tidy the toys — I'll pay you two coins!" · badge `2` | Coins arc to the hand counter · "Two coins earned!" |
| Water | "The little tree is thirsty! Water it — one coin!" · badge `1` | Coins arc to the hand counter · "One coin earned!" |
| Hunger | "Buddy's tummy is rumbling! Feed Buddy for one coin?" | Coin leaves the hand · "One coin for food. Your kite still has four of six." |
| Friend | "The bird's swing is broken! One coin builds one plank!" | Coin leaves the hand, plank appears · same goal-state line |
| Shelf | "Coins in the jar for your kite, or a lollipop right now?" | See §4 preview / outcome |
| Jars | (ritual) | Coins fly to the slots one by one, pop per coin |
| Tuck-in | (bookend) | Recap line, see §6 |
| Goal-pick | "What should we save for next?" | Six **empty** slots appear for the new goal |

### 4. Money movement tells the truth

- Earned coins fly to the **hand counter** — they are not yet saved.
- Only the shelf-save (and its jars ritual) moves coins into the slots.
- The shelf **previews the outcome before committing**: saving lights the slots that the held coins would fill; if that completes the Goal, the last slot glows with *"That's six of six — your kite!"*
- Spends fly out of the hand counter and always end by restating the Goal (*"…still has four of six"*), never with reproach (ADR-0002, ADR-0003).

### 5. Goal-reached (taste of B, no new scene)

The final slot **pops** with a big chime; the voice celebrates; the finished item visibly **arcs from the banner to its place in the Home strip**. The wish/flight scene stays in B.

### 6. Tuck-in recap (three honest variants)

Variant selection: `completedToday ? v1 : jarCoins > 0 ? v2 : v3`.

- v1 completed today: *"You did it! The kite is yours. Your little slide needs six coins — we can start tomorrow!"* (tuck-in happens after the next Goal is picked)
- v2 still saving: *"Today you earned three coins. Your kite has five of six — one more and it's yours!"*
- v3 nothing in the jar: *"Today you earned three coins. Your kite has three of six. Tomorrow we can earn more!"*

### 7. Voice generator

One shared function, used by every beat above:

- `whereGoalStands(state)` → *"Your kite has four of six."* / *"Your kite is yours!"* (uses `GOAL_LABELS`, singular/plural safe, never negative).

## Derived values — no new persisted state

- `earnedToday = coins + (fedToday ? FEED_COST : 0) + gaveToday + (lollipopToday ? LOLLIPOP_COST : 0)` — max 3.
- One transient (in-memory only) flag: `goalCompletedToday`, set at the Goal-reached celebration, consumed by the tuck-in recap, cleared by `tuckInDone`. Never persisted.

## Files touched (presentation + voice only)

`HUD.svelte`, `StartScreen.svelte`, `Greeting.svelte`, `TaskTidy.svelte`, `TaskWater.svelte`, `Hunger.svelte`, `Friend.svelte`, `Shelf.svelte`, `Jars.svelte`, `GoalReached.svelte`, `GoalPick.svelte`, `TuckIn.svelte`, `lines.ts`, plus new `goalBanner`/shared pieces. Engine (`state.ts`) gains only the transient flag; persistence schema unchanged.

## testids

All existing testids stay (15 specs must stay green). Added:

- `goal-banner`, `goal-slot-0` … `goal-slot-5` with `data-filled="true|false"`
- `plan-card-tidy`, `plan-card-water`
- `price-tag-tidy`, `price-tag-water`
- `shelf-preview`
- `recap-text`

## Testing

- **Unit:** `whereGoalStands` (0 … 6, completed, every goal label), `earnedToday` derivation, `goalCompletedToday` lifecycle.
- **E2E (extend the existing 15):**
  1. plan cards and price tags visible on greeting and tasks
  2. earning increments the hand counter, not the jar
  3. shelf preview lights the slots when saving would complete the Goal
  4. a spend (hunger, lollipop) restates the Goal state
  5. recap variants: completed today, still saving, spent
  6. goal-pick shows six empty slots for the new goal

## Success criteria

- At any moment of play, all four questions (what / why / what for / how close) are answerable — and the parent can **point at the Goal** mid-day.
- Kid signals during playtest: points at the kite, says "closer", asks to play again.

## Follow-up (B) — not in this iteration

The wish scene (Buddy spots the kite in the sky) and the kite actually flying at Goal-reached.

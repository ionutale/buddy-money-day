# Store & Play Redesign — Design

**Status:** approved in conversation (2026-09-27); awaiting written-spec review
**Supersedes in part:** the hunger economy, the bird, the lollipop, and the droop machinery from earlier specs
**Still holds:** ADR-0001 (no interest), ADR-0002 (saving is the default path), ADR-0004 (static, per-device), ADR-0003's principle (never shame) — with its droop example retired
**New:** ADR-0006 (see §10)

## 1. Why

Two pieces of playtest feedback forced this redesign:

1. **Moral:** feeding a dependent creature was modeled as a *skippable cost* — rehearsing "save coins instead of feeding the animal." Wrong lesson at any age.
2. **Direction:** the parent asked for a **store with priced toys**, bought with coins earned through **chores**, with **playable toys**, his **choice to play or earn**, a **daily chore cap** (patience), keeping **both savings systems** (jar for a big dream, store for small toys).

## 2. Goals

- Work → coins → buy/save → **play** — a loop a 4-year-old can read without text.
- **Care is rewarded, never priced.** Feeding is a paid job. Nothing in the game ever goes sad.
- **Patience** from two clocks: each chore once per day, and dream-toy prices spanning days.
- Every purchased toy delivers **real play** (a mini-game) — never a hollow purchase.

## 3. Non-goals (slice 2 or later)

- Car, Blocks, and Wagon mini-games; extra dream toys (slice 2).
- Sharing beat (removed; may return later through the store, e.g. buying a gift).
- Interest, backend, accounts — unchanged (ADRs 0001, 0004).

## 4. The Money Day, v2

Phases: `start → greeting → task-tidy | task-water | task-feed (any order, each once) → store → tuck-in → start`. The **play room** is a separate mode reachable from the title screen at any time.

1. **Plan** — the greeting shows three job cards with prices: **Tidy → 2 · Water the tree → 1 · Feed me → 1**; voice: *"Today we can earn 4 coins for your wagon!"* Cards get checkmarks as jobs finish; all-done line: *"All chores done! More tomorrow."* (`cap-line`).
2. **Chores, any order** — each offered once per day; completing one pays its coins (flight to the hand counter), checks the card, toasts the earned line with the dream restated (*"…your wagon has 7 of 12."*).
3. **Store** — "To the store!" unlocks when all chores are done.
4. **Buy or save** — tap an affordable toy to buy it; the default big button saves the rest: *"Save the rest for your wagon."*
5. **Tuck-in recap** — *"Today you earned 4 coins. Your wagon has 7 of 12 — 5 more chores tomorrow!"* Variants: dream completed today; nothing in the jar yet.
6. Back at the title: **play** or **start the next day** — his choice.

## 5. Chores

| Chore | Pays | Game (unchanged art where possible) |
|---|---|---|
| Tidy the toys | 2 | existing drag game |
| Water the little tree | 1 | existing tap game |
| Feed the bear | 1 | three snack drags into the bear's bowl; each bite munches and cheers the bear; **no cost, no skip**; the third bite pays |

Every chore states its reason and deal (existing grammar). **Feed the bear** voice: *"I'm hungry! Feed me and I'll pay you a coin!"* If a day skips it, the bear simply asks again tomorrow — no state, no sadness, no penalty (moral fix, hard requirement).

The economy cannot make care a trade-off: feeding pays; skipping costs nothing but the coin.

## 6. The bear

Never sad. Mood set shrinks to `happy | hungry | sleepy | celebrate`. `greetingSad`, `tuckInSad`, `buddySad`, and all droop logic are deleted. The hungry mood exists only inside the feed chore.

## 7. Store & economy

- **Layout:** a shelf of toys (picture + price tag + state) and a **dream pedestal** (the big toy + coin progress). The jar and the dream share the existing banner.
- **Prices:** Ball **2** · Car **4** · Blocks **6** · Wagon (dream) **12**. Chores pay max **4/day** → the wagon is ≈3 clean days, 4–5 with a toy purchase in between.
- **Buying:** tap an affordable toy → coins fly to the shop → celebration → the toy lands in **My Toys** with its game unlocked (*"It's in your room!"*). Unaffordable → honest compare + progress (*"That's 4 coins — you have 2. Two more chores tomorrow!"*), tag shows `2 of 4`. Owned → *"In your room!"*.
- **Default path stays saving** (ADR-0002): the primary button jars the remainder; buying is deliberate.
- **Dream cycle:** jar ≥ 12 → wagon celebration → wagon joins the room; the pedestal then offers the **next dream** — slice 1 ships one more: the **Big Teddy**, 12 — and when every dream is owned the list **cycles again** (like the old goals did; a second teddy is a real thing), so the loop never dead-ends. Slice 2 adds their games and richer dream lists. Remainder coins stay in the jar.
- **Slice-1 shelf:** Ball only (so nothing is ever sold without its game) + the Wagon dream (celebration now, its pull-around game in slice 2). Car & Blocks join the shelf in slice 2, each shipped **with** its game.

## 8. Play room & mini-games

- Entry: **"My Toys"** door on the title screen. Owned toys sit on a rug; tap one → its mini-game fills the screen; a house button exits. **Empty state (fresh install):** the rug sits empty with a gentle hint — *"No toys yet! Do chores, then visit the store."* — never a scolding.
- **Slice-1 game — Ball (keepy-uppy):** tap the ball as it falls to bounce it; squish + *boing* + growing sparkles; **no score, no fail**; ~20 seconds of pure play.
- **Slice 2:** Car (drag-drive around the room, honk), Blocks (drag to stack a tower, soft topple), Wagon (pull it around), each with the same no-fail philosophy.

## 9. Meaning layer, re-pointed

| Old | New |
|---|---|
| Goal banner | **Dream banner** — the wagon + 12 slots (two rows of six), popped by jar coins; previews at the store |
| Plan cards | job cards incl. Feed, with checkmarks and the cap line |
| Goal-state lines after spends | **store lines after buys**; dream restated everywhere |
| Jars/shelf scenes | absorbed by the store floor + save-remainder beat |
| `jar-progress` text | stays, now `n / 12` |

## 10. State, migration, deletions

- `ToyId = 'ball' | 'car' | 'blocks' | 'wagon' | 'teddy'`; toy catalog with `price` and `kind: 'toy' | 'dream'`.
- GameState: `owned: ToyId[]` (persisted); `goal` becomes the current dream id (default `'wagon'`); `homeItems` retired; `savedToday` stays; new transient `earnedTodayCoins` incremented per chore payment (recap uses it directly); `buddySad` deleted; `fedToday` repurposed as the feed chore's done-flag.
- **Persistence:** bump to `schemaVersion 2` with an explicit migration from v1 that keeps `childName`, `day`, and `jarCoins`, drops old goal/home items, and sets the dream to the wagon. Fresh installs unchanged.
- **Deleted:** friend/bird scene + lines + specs; lollipop (lines, buttons, specs); hunger skip/no-coin/sad lines; droop states and their specs; old shelf/jars scenes (their testids retire).
- **ADR-0006** records: work → save → buy → play; care is rewarded; daily caps teach patience; the droop consequence is retired while "never shame" remains.

## 11. testids

Kept where scenes survive (task testids, price tags, toasts, flights, banner slots → `goal-slot-*` reused as dream slots, `jar-progress`). Added:

- `store-shelf`, `store-toy-ball`, `store-dream`, `store-save-button`, `store-unaffordable` (the compare line)
- `cap-line` (all chores done), `job-card-feed`
- `toys-room`, `toy-ball`, `mini-game-ball`, `mini-game-exit`
- `feed-snack-0..2`, `bear-bowl` (the feed chore's drags and drop target)

## 12. Testing

- **Unit:** chore payment incl. feed; cap/all-done state; store afford/deny/buy; owned list; dream cycle at 12 with remainder; v1→v2 migration; recap variants; earnedTodayCoins.
- **E2E:** full day v2 (plan → 3 chores → cap line → store → save → recap); buy the ball → it appears in My Toys → its game opens/taps/exits; afford-denied line (**deferred to slice 2** per the plan amendment — slice 1's shelf never reaches the unaffordable state, so the compare branch ships unit-covered only, with its e2e landing alongside Car & Blocks); dream completion over three days; persistence across reload with owned toys; meaning specs re-pointed (dream banner, job board, store lines); deleted specs removed (hunger, lollipop, bird).
- The settings, first-run, and persistence specs stay green (settings untouched; persistence gains owned-toys coverage).

## 13. Slice plan

- **Slice 1 (this work):** engine + migration, chores incl. feed inversion, store with Ball + **Wagon and Big Teddy dreams**, Ball mini-game + toys room, plan/banner/recap re-pointed, deletions, ADR-0006, glossary, full test rework, deploy + live verification.
- **Slice 2 (next):** Car, Blocks games + shelf arrival, **Wagon and Teddy games**, extra dreams.

## 14. Success criteria

- At any moment: what am I doing, why, what do I get, how close to my dream — answerable without reading.
- He asks "one more chore tomorrow?"-shaped questions; plays the Ball unprompted; buys or saves with intent.
- The parent can point at every beat and see the economic lesson: work earns, saving is easy, buying is a choice, waiting is okay, **and caring for the bear is never a cost.**

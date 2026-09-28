# Buddy's Money Day

**Live: [buddy-money-day.vercel.app](https://buddy-money-day.vercel.app)** — open it on a phone; "Add to Home Screen" makes it feel like a real app.

A 5-minute phone game that teaches a 4-year-old the first principles of money: work earns coins, saving is for a dream you chose, buying is a choice, and caring for Buddy is never a cost.

Every Money Day: three helping tasks — tidy the toys (2 coins), water the tree (1), feed the bear (1) — then the store, where the child can buy a toy or save the rest for a dream toy (the wagon first, then the big teddy). Bought toys live in My Toys, each with something to play — the ball's keepy-uppy is in.

- **Design language:** [CONTEXT.md](./CONTEXT.md) (glossary) and [docs/adr](./docs/adr) (decisions)
- **Privacy:** completely static SPA — no backend, no accounts, no network calls; progress lives in `localStorage` (per device)
- **Voice:** optional English TTS via the Web Speech API — **off by default**; a grown-up turns it on in Grown-up Setup (the gear), where Buddy's actor can also be chosen. Every line is mirrored on screen as text; append `?mute=1` to force silence
- **No reading needed to play:** the child answers pictures, not text. Every line appears on screen so a grown-up can read along — and with voice on, it is read aloud

## Develop

```bash
pnpm install
pnpm dev --open
```

## Test

```bash
pnpm test        # engine unit tests (vitest)
pnpm test:e2e    # full playthrough tests (playwright; builds + previews the app)
```

## Build

```bash
pnpm build
pnpm preview
```

## Deploy

Deployed on Vercel, auto-deploying from `main` on every push. Manual deploy: `vercel deploy --prod`.
Rollback: `vercel rollback` or redeploy a previous commit from the Vercel dashboard.

The app is a fully static build output in `build/`, so any static host works the same way.

## Structure

```
src/lib/game/        pure engine (state, economy, persistence) + speech/sounds
src/lib/components/  scenes (the Money Day beats, the store, My Toys) and props
e2e/                 playthrough specs (Playwright)
docs/                ADRs and design specs
```

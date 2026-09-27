# Buddy's Money Day

A 5-minute, fully-voiced phone game that teaches a 4-year-old the first principles of money: effort earns coins, saving is for a goal you chose, needs come before wants, and sharing is its own reward.

- **Design language:** [CONTEXT.md](./CONTEXT.md) (glossary) and [docs/adr](./docs/adr) (decisions)
- **Privacy:** completely static SPA — no backend, no accounts, no network calls; progress lives in `localStorage` (per device)
- **Voice:** English TTS via the Web Speech API; append `?mute=1` to silence it
- **No reading required:** every instruction is spoken; numerals appear only as support

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

The app is a fully static build output in `build/`, so any static host works the same way.

## Structure

```
src/lib/game/        pure engine (state, economy, persistence) + speech/sounds
src/lib/components/  scenes (one per Money Day beat) and props
e2e/                 playthrough specs (Playwright)
docs/                ADRs and the prototype plan
```

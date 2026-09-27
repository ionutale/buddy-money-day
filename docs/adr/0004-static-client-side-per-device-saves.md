# Static client-side app; per-device saves; nothing leaves the device

The game is a fully static SPA (SvelteKit with `adapter-static`, SPA fallback, SSR disabled) with all progress in `localStorage` — no backend, no accounts, no network calls, so the child's name and progress never leave the phone that plays it. The accepted trade-off: each of the family's two phones keeps its own save, because syncing would require a server and children's data. Sync only becomes worth revisiting if the child genuinely hops phones mid-Goal.

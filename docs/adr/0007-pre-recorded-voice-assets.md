# Pre-recorded voice assets instead of Web Speech

Buddy's voice is a set of bundled MP3 clips generated once with the local
Qwen3-TTS studio and played with `<audio>`, replacing the device Web Speech
API. Web Speech gave every phone a different actor and a flat delivery; the
parent wanted one warm, consistent Buddy.

The clips are rendered with the studio's built-in `uncle_fu` ("Uncle Fu")
preset speaker (1.7B CustomVoice, 8bit) — not a designed or cloned voice. The
preset was chosen over designing or cloning a voice because it needs zero
audition setup and keeps a stable voice identity with no reference asset to
preserve or drift out of sync (unlike a cloned voice, which depends on a
reference take; individual renders are sampled and may vary slightly).

The accepted trade-offs: the clips add a few megabytes to the static build,
the child's name is no longer spoken (an arbitrary name cannot be
pre-rendered — the on-screen text keeps it), and the Grown-up Setup no
longer offers an actor picker. Voice stays off by default, `?mute=1` still
silences, and the app remains a static SPA with no backend.

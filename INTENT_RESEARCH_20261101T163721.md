# INTENT_RESEARCH_20261101T163721 — bidirectional strudel ↔ Ableton (no-loss)

**Main feature (INTENT.md):** strudel → Ableton AND Ableton → strudel with **no loss**.
Anything a participant converts into one side must survive round-trip back.

## What exists (surveyed 2026-11-01)

| Repo | Direction | Mechanism | No-loss note |
|------|-----------|-----------|--------------|
| `bfollington/strudelton` | strudel→Ableton | **Live Extensions SDK** bakes Strudel patterns into MIDI clips | AGPL-3.0; MIDI-only (notes/fx), loses synth-params |
| `valenfys/strudel-live` | strudel→Ableton | renders patterns → audio clips with **code embedded in the WAV** | the no-loss key: pattern code lives in the clip audio |
| `Andrew-Bonilla/coDAW` | both | coding-first DAW merging Ableton + Strudel | architectural reference |
| `pstoica/ableton-strudel-extension` | both | TS Live extension bridge | minimal |
| `oseconds/strudel-ableton-extension` | strudel→Ableton | Live ext | minimal |
| `hashishmoto/Maschinentraum` | strudel→Ableton | filter-automation lanes | MIDI CC |
| `LostForgotten/pilami-link-bridge` | sync | **Ableton Link** BPM/beat/transport over network | real-time clock, not clip content |

## Decision — best stack for bidirectional, no-loss

1. **Live Extensions SDK** (`Extensions Patches`) as the single Ableton integration surface
   (works on Windows + macOS; Linux via a bridge/strudel-only).
2. **strudel-live's embedded-code-in-WAV** as the canonical Ableton→strudel no-loss
   carrier: a clip's audio carries the source pattern internally, so exporting back to
   strudel is lossless (code is intrinsic to the sample).
3. **strudelton-style MIDI baking** for the structured pattern→clip lane (notes + named
   CC for params; where strudel params aren't representable they serialize into clip
   annotations the extension re-reads).
4. **Ableton Link** (via `@strudel/link`-style or pilami bridge) for live BPM/beat/transport
   so nothing resets on import/export.
5. **Lossless contract**: every MIDI/audio note carries its source strudel expression in
   clip metadata/embedded atom; round-trip = parse that back. No reconstruction by guess.

## Why not "just MIDI export"
Pure MIDI loses synth params + live-coding identity; re-import is lossy by construction.
Embedding the source expression in the clip (audio atom or clip annotation) is the only
way "no loss" is actually enforceable. That is the numbered test spec.

## Open / next
- Which of strudelton / strudel-live to adopt as deps vs re-implement inside fathom-mcp.
- Linux: no Ableton — bridge falls back to strudel-only + VSTi render (INTENT.md:2).
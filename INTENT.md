# INTENT.md — fathom-mcp (fork of williamzujkowski/live-coding-music-mcp)

**fathom**: the estate's music pen (`pens/fathom`). This MCP server is the fathom
pen's agent surface: an AI-driven music-production + live-coding brain that
speaks to BOTH the DAW world and the livecoding world.

> This is a **private fork** of `williamzujkowski/live-coding-music-mcp`
> (MIT/AGPL-3.0). Upstream is retained as a remote (`upstream`) and its full
> feature set is **preserved verbatim** — 28 tools for strudel pattern
> generation, sandboxing, MIDI import/export, audio analysis/capture, AI
> (Gemini + AiTransport), session management, is`olated engine, livecoding.
> We built on top; we did not carve away.

## The target (highly intentional)

Make fathom-mcp the cross-platform music-production MCP with **Ableton and
Strudel as co-equal mains**, and VSTi support:

| Axis | Target |
|------|--------|
| **OS** | Windows · Linux · macOS — all three are first-class |
| **DAW main** | Ableton Live (link/clip/session/arrange + audio export) |
| **Livecoding main** | Strudel (pattern engine, browser REPL, sample sampler) |
| **VSTi** | Host VST instruments — Serum 2 (via the private `abyss` deob/`zygzxg_render` path), plus generic VSTi bridges |

## How the existing seam maps (already cross-OS)

- `config.json:strudel_url` drives the strudel target. It already points at the
  estate-local workbench (`http://localhost:8088`) + sampler (`:55432`) on
  Linux. On Windows/macOS the same knob points at that OS's native/headless
  strudel or the OS browser.
- `StrudelController` launches **Chromium via Playwright** — Playwright's
  browser engine is OS-agnostic (win/darwin/linux binaries), so browser-only
  strudel functions work regardless of host OS.
- Sprintz: VSTi hosting needs a DAW-style host (Ableton's own API, or a VST3
  host process / `zygzxg_render`). Ableton-mcp bridges are the template.

## Task list (the height of ambition)

1. **Preserve 100% of upstream** (28 tools + tests) — DONE.
2. **Cross-OS**: verify/parametrize every browser + engine path by
   `process.platform` (win32/darwin/linux); no hardcoded Unix-isms.
3. **Ableton main**: add Ableton Live session/clip/track/export tools
   (Ableton's MIDI/Link or the Ableton API), cross-platform (win/mac).
4. **VSTi**: add VSTi rendering tools — host Serum 2 / generic VST3 via the
   private abyss/`zygzxg_render` bridge (Linux: no DAW needed, offline render;
   win/mac: DAW or VST3 host).
5. **Register** in estate Thresher gateway so agents get the tools via MCP.

## Rules (override ALL prior file docs)

- **Private fork**: do NOT expose the abyss/serum2/VST-binary internals in
  this repo. Only the clean public capability ("loads .fxp / .SerumPreset via
  the render bridge") is allowed here.
- **Do not degrade upstream features** — every added feature must keep the
  original ones fully working and tested.
- Tests stay green + adapted platform-aware (browser tests must not hard-fail
  on headless/no-network CI).
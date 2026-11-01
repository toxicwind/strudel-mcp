/**
 * Per-OS platform matrix for fathom-mcp (INTENT.md:2).
 *
 * Everything below returns the correct DAW/VSTi/browser target for the host
 * OS so the SAME tools work on Windows, Linux and macOS. All original
 * strudel functionality is OS-agnostic via Playwright; only the DAW/VSTi
 * integration and default strudel url vary.
 */
import process from 'node:process'

export type Platform = 'win32' | 'linux' | 'darwin' | 'other'

export const platform: Platform =
  process.platform === 'win32' || process.platform === 'linux' || process.platform === 'darwin'
    ? process.platform
    : 'other'

export interface FathomPlatform {
  readonly platform: Platform
  /** which DAW is the primary integration target on this OS */
  readonly daw: 'ableton' | null
  /** how to reach a VSTi host on this OS */
  readonly vsti: 'ableton-vst3' | 'zygzxg-render' | null
  /** default strudel target for this OS (estate-local on linux) */
  readonly strudelUrl: string
  /** artifact dir for rendered audio (per-OS, predictable) */
  readonly artifactDir: string
}

const DEFAULTS: Record<Platform, Omit<FathomPlatform, 'platform'>> = {
  win32: {
    daw: 'ableton',
    vsti: 'ableton-vst3',
    strudelUrl: process.env.FATHOM_STRUDEL_URL ?? 'http://localhost:8088/',
    artifactDir: process.env.LOCALAPPDATA ?? '%LOCALAPPDATA%', // windows artifact root
  },
  darwin: {
    daw: 'ableton',
    vsti: 'ableton-vst3', // macOS: Ableton hosts AU/VST3 directly
    strudelUrl: process.env.FATHOM_STRUDEL_URL ?? 'http://localhost:8088/',
    artifactDir: process.env.HOME ?? '/tmp',
  },
  linux: {
    daw: null, // no Ableton on Linux by default (Ableton dropped Linux support)
    vsti: 'zygzxg-render', // offline native render — no DAW needed (INTENT:6)
    strudelUrl: process.env.FATHOM_STRUDEL_URL ?? 'http://localhost:8088/',
    artifactDir: process.env.HOME ?? '/tmp',
  },
  other: {
    daw: null,
    vsti: null,
    strudelUrl: process.env.FATHOM_STRUDEL_URL ?? 'http://localhost:8088/',
    artifactDir: '/tmp',
  },
}

export const fathomPlatform: FathomPlatform = { platform, ...DEFAULTS[platform] }
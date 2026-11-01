import process from 'node:process'

// Re-import the module per platform so the load-time `process.platform` read
// (and the win32/darwin/linux/other table) is exercised for each OS.
async function loadFor(plat: NodeJS.Platform) {
  const spy = jest.spyOn(process, 'platform', 'get').mockReturnValue(plat)
  jest.resetModules()
  const mod = await import('./platform')
  spy.mockRestore()
  return mod
}

describe('fathom platform matrix (INTENT.md:2)', () => {
  it('windows resolves Ableton + Serum VST3 renderer', async () => {
    const { fathomPlatform } = await loadFor('win32')
    expect(fathomPlatform.platform).toBe('win32')
    expect(fathomPlatform.daw).toBe('ableton')
    expect(fathomPlatform.vsti).toBe('serum-vst3')
    expect(fathomPlatform.strudelUrl).toContain('localhost')
  })

  it('mac resolves Ableton + serum-vst3 renderer', async () => {
    const { fathomPlatform } = await loadFor('darwin')
    expect(fathomPlatform.platform).toBe('darwin')
    expect(fathomPlatform.daw).toBe('ableton')
    expect(fathomPlatform.vsti).toBe('serum-vst3')
  })

  it('linux keeps strudel-only + zyg-render VSTi (our estate default)', async () => {
    const { fathomPlatform } = await loadFor('linux')
    expect(fathomPlatform.platform).toBe('linux')
    expect(fathomPlatform.daw).toBe('strudel')
    expect(fathomPlatform.vsti).toBe('zygzxg-render')
  })

  it('unknown OS is safe (no DAW/VSTi, strudel still reachable)', async () => {
    const { fathomPlatform } = await loadFor('sunos')
    expect(fathomPlatform.daw).toBeNull()
    expect(fathomPlatform.vsti).toBeNull()
    expect(fathomPlatform.strudelUrl).toContain('localhost:8088')
  })
})
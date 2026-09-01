import { describe, it, expect, afterAll } from 'vitest'
import { rm } from 'node:fs/promises'
import { saveAudioFile, readAudioFile, AUDIO_DIR } from './storage'

afterAll(async () => {
  await rm(AUDIO_DIR, { recursive: true, force: true })
})

describe('audio storage', () => {
  it('guarda y relee el mismo contenido', async () => {
    const rel = await saveAudioFile(Buffer.from('hola'), 'mp3')
    expect(rel).toMatch(/\.mp3$/)
    expect((await readAudioFile(rel)).toString()).toBe('hola')
  })

  it('readAudioFile rechaza path traversal', async () => {
    await expect(readAudioFile('../../etc/passwd')).rejects.toThrow()
  })
})

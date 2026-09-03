import { describe, it, expect, afterAll } from 'vitest'
import { rm } from 'node:fs/promises'
import {
  saveAudioFile,
  readAudioFile,
  AUDIO_DIR,
  saveBookFile,
  listBookFiles,
  readBookFile,
  deleteBookFile,
  BOOKS_DIR,
} from './storage'

afterAll(async () => {
  await rm(AUDIO_DIR, { recursive: true, force: true })
  await rm(BOOKS_DIR, { recursive: true, force: true })
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

describe('book storage', () => {
  it('guarda, lista, relee y borra un libro', async () => {
    const { filename } = await saveBookFile(Buffer.from('%PDF-1.4'), 'mi libro.pdf')
    expect(await listBookFiles()).toContain(filename)
    expect((await readBookFile(filename)).toString()).toBe('%PDF-1.4')

    await deleteBookFile(filename)
    expect(await listBookFiles()).not.toContain(filename)
  })

  it('readBookFile rechaza path traversal', async () => {
    await expect(readBookFile('../../etc/passwd')).rejects.toThrow()
  })

  it('deleteBookFile rechaza path traversal', async () => {
    await expect(deleteBookFile('../../etc/passwd')).rejects.toThrow()
  })
})

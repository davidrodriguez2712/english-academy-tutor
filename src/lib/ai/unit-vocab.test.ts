import { describe, it, expect, vi, beforeEach } from 'vitest'

const create = vi.fn()
vi.mock('./client', () => ({
  openai: () => ({ chat: { completions: { create } } }),
}))

import { generateUnitVocab } from './unit-vocab'

beforeEach(() => create.mockReset())

const word = {
  word: 'delay',
  translation: 'retraso',
  meaning: 'a period of time by which something is late',
  partOfSpeech: 'noun',
  ipa: '/dɪˈleɪ/',
  examples: ['The delay was long.', 'There was a delay.', 'We had a delay.'],
}

describe('generateUnitVocab', () => {
  it('parsea y valida la lista del modelo', async () => {
    create.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ items: [word, { ...word, word: 'trip' }] }) } }],
    })
    const c = await generateUnitVocab('texto de la unidad')
    expect(c.items).toHaveLength(2)
    expect(c.items[0].word).toBe('delay')
  })

  it('lanza AiError si falta content (tras el reintento)', async () => {
    create.mockResolvedValue({ choices: [{ message: {} }] })
    await expect(generateUnitVocab('t')).rejects.toMatchObject({
      name: 'AiError',
      label: 'generateUnitVocab',
    })
    expect(create).toHaveBeenCalledTimes(2)
  })

  it('lanza AiError si el JSON no cumple el schema', async () => {
    create.mockResolvedValue({ choices: [{ message: { content: JSON.stringify({ items: [] }) } }] })
    await expect(generateUnitVocab('t')).rejects.toMatchObject({ name: 'AiError' })
    expect(create).toHaveBeenCalledTimes(2)
  })
})

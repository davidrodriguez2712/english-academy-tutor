import { describe, it, expect, vi, beforeEach } from 'vitest'

const create = vi.fn()
vi.mock('./client', () => ({
  openai: () => ({ chat: { completions: { create } } }),
}))

import { enrichVocab } from './vocab'

beforeEach(() => create.mockReset())

const valid = {
  translation: 'despegar',
  meaning: 'to leave the ground',
  partOfSpeech: 'phrasal verb',
  ipa: '/teɪk ɒf/',
  examples: ['The plane took off.', 'We took off early.', 'It took off fast.'],
}

describe('enrichVocab', () => {
  it('parsea y valida la respuesta del modelo', async () => {
    create.mockResolvedValue({ choices: [{ message: { content: JSON.stringify(valid) } }] })
    const r = await enrichVocab('take off')
    expect(r.partOfSpeech).toBe('phrasal verb')
    expect(r.examples).toHaveLength(3)
  })

  it('lanza AiError si falta content (tras el reintento)', async () => {
    create.mockResolvedValue({ choices: [{ message: {} }] })
    await expect(enrichVocab('take off')).rejects.toMatchObject({
      name: 'AiError',
      label: 'enrichVocab',
    })
    expect(create).toHaveBeenCalledTimes(2)
  })

  it('lanza AiError si el JSON no cumple el schema', async () => {
    create.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ ...valid, examples: ['one', 'two'] }) } }],
    })
    await expect(enrichVocab('take off')).rejects.toMatchObject({ name: 'AiError' })
    expect(create).toHaveBeenCalledTimes(2)
  })
})

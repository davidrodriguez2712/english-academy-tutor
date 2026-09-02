import { describe, it, expect } from 'vitest'
import { unitVocabSchema, parseUnitVocab } from './unit-vocab'

const word = {
  word: 'take off',
  translation: 'despegar',
  meaning: 'to leave the ground and begin to fly',
  partOfSpeech: 'phrasal verb',
  ipa: '/teɪk ɒf/',
  examples: ['The plane took off.', 'We took off at dawn.', 'The rocket took off.'],
}

describe('unitVocabSchema', () => {
  it('acepta una lista con términos completos', () => {
    expect(unitVocabSchema.safeParse({ items: [word, { ...word, word: 'delay' }] }).success).toBe(true)
  })
  it('rechaza una lista vacía', () => {
    expect(unitVocabSchema.safeParse({ items: [] }).success).toBe(false)
  })
  it('rechaza un término sin word', () => {
    const { word: _w, ...rest } = word
    void _w
    expect(unitVocabSchema.safeParse({ items: [rest] }).success).toBe(false)
  })
  it('rechaza un término con menos de 3 ejemplos', () => {
    expect(unitVocabSchema.safeParse({ items: [{ ...word, examples: ['a', 'b'] }] }).success).toBe(false)
  })
})

describe('parseUnitVocab', () => {
  it('devuelve el objeto tipado y recorta espacios', () => {
    const c = parseUnitVocab({ items: [{ ...word, word: '  take off  ' }] })
    expect(c.items[0].word).toBe('take off')
  })
  it('lanza con contenido inválido', () => {
    expect(() => parseUnitVocab({ foo: 1 })).toThrow()
  })
})

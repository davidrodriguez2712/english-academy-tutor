import { describe, it, expect } from 'vitest'
import {
  normalizeWord,
  serializeExamples,
  deserializeExamples,
  toVocabDTO,
} from './entry'

describe('normalizeWord', () => {
  it('recorta, pasa a minúsculas y colapsa espacios', () => {
    expect(normalizeWord('  Take   Off ')).toBe('take off')
  })
  it('lanza si queda vacío', () => {
    expect(() => normalizeWord('   ')).toThrow()
  })
})

describe('serializeExamples / deserializeExamples', () => {
  const three = ['One sentence.', 'Two sentences.', 'Three sentences.']
  it('ida y vuelta preserva el array', () => {
    expect(deserializeExamples(serializeExamples(three))).toEqual(three)
  })
  it('serializeExamples rechaza menos de 3', () => {
    expect(() => serializeExamples(['a', 'b'])).toThrow()
  })
  it('serializeExamples rechaza strings vacías', () => {
    expect(() => serializeExamples(['a', 'b', '  '])).toThrow()
  })
  it('deserializeExamples rechaza JSON que no es array de strings', () => {
    expect(() => deserializeExamples('{"x":1}')).toThrow()
    expect(() => deserializeExamples('["a","b"]')).toThrow()
  })
})

describe('toVocabDTO', () => {
  it('convierte examples a array y omite word', () => {
    const dto = toVocabDTO({
      id: 'c1',
      word: 'take off',
      displayWord: 'take off',
      translation: 'despegar',
      meaning: 'to leave the ground',
      partOfSpeech: 'phrasal verb',
      ipa: '/teɪk ɒf/',
      examples: JSON.stringify(['The plane took off.', 'We took off early.', 'It took off fast.']),
      status: 'IN_PROGRESS',
      category: null,
      createdAt: new Date('2026-09-02T00:00:00Z'),
    })
    expect(dto.examples).toHaveLength(3)
    expect(dto.displayWord).toBe('take off')
    expect('word' in dto).toBe(false)
  })
})

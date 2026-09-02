import { describe, it, expect } from 'vitest'
import { vocabEnrichmentSchema, parseVocabEnrichment } from './vocab'

const valid = {
  translation: 'despegar',
  meaning: 'to leave the ground and begin to fly',
  partOfSpeech: 'phrasal verb',
  ipa: '/teɪk ɒf/',
  examples: ['The plane took off.', 'We took off at dawn.', 'The rocket took off.'],
}

describe('vocabEnrichmentSchema', () => {
  it('acepta un payload completo', () => {
    expect(vocabEnrichmentSchema.safeParse(valid).success).toBe(true)
  })
  it('rechaza menos de 3 ejemplos', () => {
    expect(vocabEnrichmentSchema.safeParse({ ...valid, examples: ['a', 'b'] }).success).toBe(false)
  })
  it('rechaza campos ausentes', () => {
    const { ipa: _ipa, ...rest } = valid
    void _ipa
    expect(vocabEnrichmentSchema.safeParse(rest).success).toBe(false)
  })
  it('rechaza strings vacías', () => {
    expect(vocabEnrichmentSchema.safeParse({ ...valid, translation: '' }).success).toBe(false)
  })
})

describe('parseVocabEnrichment', () => {
  it('devuelve el objeto tipado', () => {
    expect(parseVocabEnrichment(valid).partOfSpeech).toBe('phrasal verb')
  })
  it('lanza con contenido inválido', () => {
    expect(() => parseVocabEnrichment({ foo: 1 })).toThrow()
  })
})

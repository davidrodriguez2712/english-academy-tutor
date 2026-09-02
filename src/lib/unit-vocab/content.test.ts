import { describe, it, expect } from 'vitest'
import { serializeUnitVocab, deserializeUnitVocab } from './content'

const content = {
  items: [
    {
      word: 'delay',
      translation: 'retraso',
      meaning: 'a period of time by which something is late',
      partOfSpeech: 'noun',
      ipa: '/dɪˈleɪ/',
      examples: ['The delay was long.', 'There was a delay.', 'We had a delay.'],
    },
  ],
}

describe('serializeUnitVocab / deserializeUnitVocab', () => {
  it('ida y vuelta conserva el contenido', () => {
    expect(deserializeUnitVocab(serializeUnitVocab(content))).toEqual(content)
  })
  it('serializeUnitVocab lanza con contenido inválido', () => {
    expect(() => serializeUnitVocab({ items: [] })).toThrow()
  })
  it('deserializeUnitVocab lanza con JSON inválido', () => {
    expect(() => deserializeUnitVocab('{"items":[]}')).toThrow()
  })
})

import { describe, it, expect } from 'vitest'
import { deserializeContent, serializeContent } from './exercise-set'
import * as fx from '@/lib/validation/fixtures/exercises'

describe('serialize/deserialize', () => {
  it('ida y vuelta valida el contenido', () => {
    const s = serializeContent('FLASHCARDS', fx.flashcards)
    expect(typeof s).toBe('string')
    expect(deserializeContent('FLASHCARDS', s).items).toHaveLength(15)
  })
  it('deserialize lanza si el contenido guardado no valida', () => {
    expect(() => deserializeContent('MATCHING', '{"items":[]}')).toThrow()
  })
})

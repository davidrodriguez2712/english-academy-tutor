import { describe, it, expect } from 'vitest'
import { normalizeAnswer, isFillBlankCorrect } from './normalize'

describe('normalizeAnswer', () => {
  it('minúsculas, sin tildes, espacios colapsados, trim', () => {
    expect(normalizeAnswer('  Él   Está ')).toBe('el esta')
    expect(normalizeAnswer('CAFÉ')).toBe('cafe')
  })
})

describe('isFillBlankCorrect', () => {
  it('acepta la respuesta canónica ignorando mayúsculas/tildes', () => {
    expect(isFillBlankCorrect('Went', 'went', [])).toBe(true)
  })
  it('acepta variantes', () => {
    expect(isFillBlankCorrect("didn't", 'did not', ["didn't"])).toBe(true)
  })
  it('rechaza lo incorrecto', () => {
    expect(isFillBlankCorrect('go', 'went', [])).toBe(false)
  })
  it('respuesta vacía es incorrecta', () => {
    expect(isFillBlankCorrect('   ', 'went', [])).toBe(false)
  })
})

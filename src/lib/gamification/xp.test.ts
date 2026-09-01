import { describe, it, expect } from 'vitest'
import { xpForExercise, XP_PER_SPEAKING_TURN } from './xp'

describe('xpForExercise', () => {
  it('opción múltiple: 10 base + 2 por acierto', () => {
    expect(xpForExercise('MULTIPLE_CHOICE', 0)).toBe(10)
    expect(xpForExercise('MULTIPLE_CHOICE', 7)).toBe(24)
  })
  it('rellenar, relacionar, ordenar usan la misma fórmula', () => {
    expect(xpForExercise('FILL_BLANKS', 10)).toBe(30)
    expect(xpForExercise('MATCHING', 8)).toBe(26)
    expect(xpForExercise('ORDER_WORDS', 6)).toBe(22)
  })
  it('flashcards: 5 fijos sin importar el conteo', () => {
    expect(xpForExercise('FLASHCARDS', 0)).toBe(5)
    expect(xpForExercise('FLASHCARDS', 15)).toBe(5)
  })
})

describe('XP_PER_SPEAKING_TURN', () => {
  it('es 20', () => {
    expect(XP_PER_SPEAKING_TURN).toBe(20)
  })
})

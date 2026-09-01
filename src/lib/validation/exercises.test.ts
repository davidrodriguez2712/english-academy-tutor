import { describe, it, expect } from 'vitest'
import { exerciseSchemaFor, parseExerciseContent } from './exercises'
import * as fx from './fixtures/exercises'

describe('exerciseSchemaFor', () => {
  it('valida fixtures correctos de cada tipo', () => {
    expect(exerciseSchemaFor('MULTIPLE_CHOICE').safeParse(fx.multipleChoice).success).toBe(true)
    expect(exerciseSchemaFor('FILL_BLANKS').safeParse(fx.fillBlanks).success).toBe(true)
    expect(exerciseSchemaFor('MATCHING').safeParse(fx.matching).success).toBe(true)
    expect(exerciseSchemaFor('ORDER_WORDS').safeParse(fx.orderWords).success).toBe(true)
    expect(exerciseSchemaFor('FLASHCARDS').safeParse(fx.flashcards).success).toBe(true)
  })

  it('rechaza opción múltiple con correctIndex fuera de rango', () => {
    const bad = { items: [{ question: 'q', options: ['a', 'b'], correctIndex: 5, explanation: 'e' }] }
    expect(exerciseSchemaFor('MULTIPLE_CHOICE').safeParse(bad).success).toBe(false)
  })

  it('rechaza JSON con forma equivocada', () => {
    expect(exerciseSchemaFor('FLASHCARDS').safeParse({ foo: 1 }).success).toBe(false)
  })
})

describe('parseExerciseContent', () => {
  it('lanza con contenido inválido', () => {
    expect(() => parseExerciseContent('MATCHING', { items: [] })).toThrow()
  })
  it('devuelve el objeto tipado con contenido válido', () => {
    const c = parseExerciseContent('FLASHCARDS', fx.flashcards)
    expect(c.items.length).toBe(15)
  })
})

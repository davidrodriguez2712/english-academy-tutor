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

  it('acepta opción múltiple con referencia de página', () => {
    const ok = {
      items: [{ question: 'q', options: ['a', 'b'], correctIndex: 0, explanation: 'e', page: 12 }],
    }
    expect(exerciseSchemaFor('MULTIPLE_CHOICE').safeParse(ok).success).toBe(true)
  })
  it('rechaza page no positiva en opción múltiple', () => {
    const bad = {
      items: [{ question: 'q', options: ['a', 'b'], correctIndex: 0, explanation: 'e', page: 0 }],
    }
    expect(exerciseSchemaFor('MULTIPLE_CHOICE').safeParse(bad).success).toBe(false)
  })
  it('acepta rellenar huecos con y sin page', () => {
    const ok = {
      items: [
        { sentence: 'He ___ home.', answer: 'went', acceptedVariants: [], page: 5 },
        { sentence: 'She ___ it.', answer: 'did', acceptedVariants: [] },
      ],
    }
    expect(exerciseSchemaFor('FILL_BLANKS').safeParse(ok).success).toBe(true)
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

import { describe, it, expect } from 'vitest'
import {
  gradeMultipleChoice,
  gradeFillBlanks,
  gradeOrderWords,
  gradeMatching,
} from './grade'

describe('gradeMultipleChoice', () => {
  it('cuenta aciertos y calcula score', () => {
    const qs = [{ correctIndex: 1 }, { correctIndex: 0 }, { correctIndex: 3 }]
    expect(gradeMultipleChoice([1, 2, 3], qs)).toEqual({
      correctCount: 2,
      totalCount: 3,
      score: 67,
    })
  })
  it('respuesta null cuenta como fallo', () => {
    expect(gradeMultipleChoice([null], [{ correctIndex: 0 }]).correctCount).toBe(0)
  })
})

describe('gradeFillBlanks', () => {
  it('usa normalización y variantes', () => {
    const items = [
      { answer: 'went', acceptedVariants: [] },
      { answer: 'did not', acceptedVariants: ["didn't"] },
    ]
    expect(gradeFillBlanks(['WENT', "didn't"], items)).toEqual({
      correctCount: 2,
      totalCount: 2,
      score: 100,
    })
  })
})

describe('gradeOrderWords', () => {
  it('correcto solo si el orden coincide exactamente', () => {
    const items = [{ correctOrder: ['I', 'am', 'here'] }, { correctOrder: ['she', 'runs'] }]
    expect(gradeOrderWords([['I', 'am', 'here'], ['runs', 'she']], items)).toEqual({
      correctCount: 1,
      totalCount: 2,
      score: 50,
    })
  })
})

describe('gradeMatching', () => {
  it('cuenta pares alineados', () => {
    expect(gradeMatching({ 0: 0, 1: 2, 2: 2 }, 3)).toEqual({
      correctCount: 2,
      totalCount: 3,
      score: 67,
    })
  })
})

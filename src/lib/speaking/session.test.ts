import { describe, it, expect } from 'vitest'
import { resolveTopic, totalTurnsForMode } from './session'

describe('totalTurnsForMode', () => {
  it('guiado 5, monólogo 1', () => {
    expect(totalTurnsForMode('GUIDED')).toBe(5)
    expect(totalTurnsForMode('MONOLOGUE')).toBe(1)
  })
})

describe('resolveTopic', () => {
  it('guiado con unidad usa el título de la unidad', () => {
    expect(resolveTopic({ mode: 'GUIDED', unitTitle: 'Daily routines' })).toBe('Daily routines')
  })
  it('guiado sin unidad usa el tema escrito', () => {
    expect(resolveTopic({ mode: 'GUIDED', customTopic: 'My last trip' })).toBe('My last trip')
  })
  it('monólogo exige tema escrito', () => {
    expect(() => resolveTopic({ mode: 'MONOLOGUE', customTopic: '  ' })).toThrow()
    expect(resolveTopic({ mode: 'MONOLOGUE', customTopic: 'Hobbies' })).toBe('Hobbies')
  })
})

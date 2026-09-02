import { describe, it, expect } from 'vitest'
import { buildHistory, nextTurnIndex, isSessionComplete } from './turn'

const turns = [
  { index: 1, assistantPrompt: 'Q1', userTranscript: 'A1' },
  { index: 2, assistantPrompt: 'Q2', userTranscript: null },
]

describe('buildHistory', () => {
  it('alterna assistant/user y omite transcripts nulos', () => {
    expect(buildHistory(turns)).toEqual([
      { role: 'assistant', text: 'Q1' },
      { role: 'user', text: 'A1' },
      { role: 'assistant', text: 'Q2' },
    ])
  })
})

describe('nextTurnIndex', () => {
  it('es max(index)+1', () => {
    expect(nextTurnIndex(turns)).toBe(3)
  })
})

describe('isSessionComplete', () => {
  it('true cuando los turnos guardados alcanzan totalTurns', () => {
    expect(isSessionComplete({ totalTurns: 5 }, 5)).toBe(true)
    expect(isSessionComplete({ totalTurns: 5 }, 4)).toBe(false)
    expect(isSessionComplete({ totalTurns: 1 }, 1)).toBe(true)
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'

const create = vi.fn()
vi.mock('./client', () => ({
  openai: () => ({ chat: { completions: { create } } }),
}))

import { reviewSpeakingTurn } from './speaking'

const modelReview = {
  correctedText: 'I went to the park yesterday.',
  naturalVersion: 'I headed to the park yesterday.',
  fluencyTip: 'Usa el pasado simple para acciones terminadas.',
  nextAssistantPrompt: 'What did you do at the park?',
}

function mockModel() {
  create.mockResolvedValue({
    choices: [{ message: { content: JSON.stringify(modelReview) } }],
  })
}

beforeEach(() => {
  create.mockReset()
  mockModel()
})

const base = {
  transcript: 'I go to the park yesterday',
  topic: 'Weekend plans',
  history: [{ role: 'assistant' as const, text: 'What did you do last weekend?' }],
}

describe('reviewSpeakingTurn — override de nextAssistantPrompt', () => {
  it('lo fuerza a null en modo MONOLOGUE aunque el modelo devuelva un string', async () => {
    const res = await reviewSpeakingTurn({
      ...base,
      mode: 'MONOLOGUE',
      turnIndex: 1,
      totalTurns: 1,
    })
    expect(res.nextAssistantPrompt).toBeNull()
  })

  it('lo fuerza a null en GUIDED cuando turnIndex >= totalTurns', async () => {
    const res = await reviewSpeakingTurn({
      ...base,
      mode: 'GUIDED',
      turnIndex: 5,
      totalTurns: 5,
    })
    expect(res.nextAssistantPrompt).toBeNull()
  })

  it('lo preserva en GUIDED cuando turnIndex < totalTurns', async () => {
    const res = await reviewSpeakingTurn({
      ...base,
      mode: 'GUIDED',
      turnIndex: 2,
      totalTurns: 5,
    })
    expect(res.nextAssistantPrompt).toBe('What did you do at the park?')
  })
})

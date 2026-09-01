import { describe, it, expect } from 'vitest'
import { parseTurnReview, parseGuidedOpener } from './speaking'

describe('parseTurnReview', () => {
  it('acepta review con nextAssistantPrompt', () => {
    const r = parseTurnReview({
      correctedText: 'I woke up at six.',
      naturalVersion: 'I usually wake up at six.',
      fluencyTip: 'Use "usually" for habits.',
      nextAssistantPrompt: 'What did you have for breakfast?',
    })
    expect(r.nextAssistantPrompt).toContain('breakfast')
  })
  it('acepta review con nextAssistantPrompt null (monólogo / turno final)', () => {
    const r = parseTurnReview({
      correctedText: 'x',
      naturalVersion: 'y',
      fluencyTip: 'z',
      nextAssistantPrompt: null,
    })
    expect(r.nextAssistantPrompt).toBeNull()
  })
  it('rechaza si falta un campo', () => {
    expect(() => parseTurnReview({ correctedText: 'x' })).toThrow()
  })
})

describe('parseGuidedOpener', () => {
  it('exige assistantPrompt no vacío', () => {
    expect(() => parseGuidedOpener({ assistantPrompt: '' })).toThrow()
    expect(parseGuidedOpener({ assistantPrompt: 'Tell me about your day.' }).assistantPrompt).toBeTruthy()
  })
})

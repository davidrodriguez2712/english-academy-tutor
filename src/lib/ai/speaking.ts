import type { SpeakingMode } from '@prisma/client'
import { openai } from './client'
import { MODELS } from './config'
import { withRetry, AiError } from './retry'
import { guidedOpenerPrompt, turnReviewPrompt } from './prompts'
import { parseGuidedOpener, parseTurnReview, type TurnReview } from '@/lib/validation/speaking'

async function jsonChat(system: string, user: string, label: string): Promise<unknown> {
  const res = await openai().chat.completions.create({
    model: MODELS.chat,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  })
  const raw = res.choices[0]?.message?.content
  if (!raw) throw new AiError(label)
  return JSON.parse(raw)
}

export async function generateGuidedOpener(topic: string): Promise<string> {
  const { system, user } = guidedOpenerPrompt(topic)
  return withRetry(async () => {
    const parsed = parseGuidedOpener(await jsonChat(system, user, 'generateGuidedOpener'))
    return parsed.assistantPrompt
  }, 'generateGuidedOpener')
}

export async function reviewSpeakingTurn(input: {
  transcript: string
  topic: string
  mode: SpeakingMode
  turnIndex: number
  totalTurns: number
  history: { role: 'assistant' | 'user'; text: string }[]
}): Promise<TurnReview> {
  const { system, user } = turnReviewPrompt(input)
  return withRetry(async () => {
    const review = parseTurnReview(await jsonChat(system, user, 'reviewSpeakingTurn'))
    // fuerza la regla de negocio aunque el modelo se desvíe
    if (input.mode === 'MONOLOGUE' || input.turnIndex >= input.totalTurns) {
      return { ...review, nextAssistantPrompt: null }
    }
    return review
  }, 'reviewSpeakingTurn')
}

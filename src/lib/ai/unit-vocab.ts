import { openai } from './client'
import { MODELS } from './config'
import { withRetry, AiError } from './retry'
import { unitVocabPrompt } from './prompts'
import { parseUnitVocab, type UnitVocabContent } from '@/lib/validation/unit-vocab'

export async function generateUnitVocab(unitText: string): Promise<UnitVocabContent> {
  const { system, user } = unitVocabPrompt(unitText)
  return withRetry(async () => {
    const res = await openai().chat.completions.create({
      model: MODELS.chat,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    })
    const raw = res.choices[0]?.message?.content
    if (!raw) throw new AiError('generateUnitVocab')
    return parseUnitVocab(JSON.parse(raw))
  }, 'generateUnitVocab')
}

import { openai } from './client'
import { MODELS } from './config'
import { withRetry, AiError } from './retry'
import { vocabPrompt } from './prompts'
import { parseVocabEnrichment, type VocabEnrichment } from '@/lib/validation/vocab'

export async function enrichVocab(word: string): Promise<VocabEnrichment> {
  const { system, user } = vocabPrompt(word)
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
    if (!raw) throw new AiError('enrichVocab')
    return parseVocabEnrichment(JSON.parse(raw))
  }, 'enrichVocab')
}

import type { ExerciseType } from '@prisma/client'
import { openai } from './client'
import { MODELS } from './config'
import { withRetry, AiError } from './retry'
import { exercisePrompt } from './prompts'
import { parseExerciseContent, type ExerciseContent } from '@/lib/validation/exercises'

export async function generateExercises(
  unitText: string,
  type: ExerciseType,
): Promise<ExerciseContent> {
  const { system, user } = exercisePrompt(unitText, type)
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
    if (!raw) throw new AiError('generateExercises')
    return parseExerciseContent(type, JSON.parse(raw))
  }, 'generateExercises')
}

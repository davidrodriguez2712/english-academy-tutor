import type { ExerciseType } from '@prisma/client'
import { parseExerciseContent, type ExerciseContent } from '@/lib/validation/exercises'

export function serializeContent(type: ExerciseType, content: unknown): string {
  return JSON.stringify(parseExerciseContent(type, content))
}

export function deserializeContent(type: ExerciseType, raw: string): ExerciseContent {
  return parseExerciseContent(type, JSON.parse(raw))
}

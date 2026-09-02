import type { ExerciseType } from '@prisma/client'

export const XP_PER_SPEAKING_TURN = 20

export function xpForExercise(type: ExerciseType, correctCount: number): number {
  if (type === 'FLASHCARDS') return 5
  return 10 + 2 * Math.max(0, correctCount)
}

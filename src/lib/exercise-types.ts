import type { ExerciseType } from '@prisma/client'

export const EXERCISE_TABS: { type: ExerciseType; label: string }[] = [
  { type: 'MULTIPLE_CHOICE', label: 'Opción múltiple' },
  { type: 'FILL_BLANKS', label: 'Rellenar huecos' },
  { type: 'MATCHING', label: 'Relacionar' },
  { type: 'ORDER_WORDS', label: 'Ordenar frases' },
  { type: 'FLASHCARDS', label: 'Flashcards' },
]

const SET = new Set(EXERCISE_TABS.map((t) => t.type))
export function isExerciseType(s: string): s is ExerciseType {
  return SET.has(s as ExerciseType)
}

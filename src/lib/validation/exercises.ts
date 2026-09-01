import { z } from 'zod'
import type { ExerciseType } from '@prisma/client'

export const multipleChoiceSchema = z.object({
  items: z
    .array(
      z
        .object({
          question: z.string().min(1),
          options: z.array(z.string().min(1)).min(2).max(6),
          correctIndex: z.number().int().min(0),
          explanation: z.string().min(1),
        })
        .refine((q) => q.correctIndex < q.options.length, {
          message: 'correctIndex fuera de rango',
        }),
    )
    .min(1),
})

export const fillBlanksSchema = z.object({
  items: z
    .array(
      z.object({
        sentence: z.string().includes('___'),
        answer: z.string().min(1),
        acceptedVariants: z.array(z.string()).default([]),
      }),
    )
    .min(1),
})

export const matchingSchema = z.object({
  items: z.array(z.object({ left: z.string().min(1), right: z.string().min(1) })).min(2),
})

export const orderWordsSchema = z.object({
  items: z
    .array(
      z
        .object({
          scrambled: z.array(z.string().min(1)).min(2),
          correctOrder: z.array(z.string().min(1)).min(2),
        })
        .refine((it) => it.scrambled.length === it.correctOrder.length, {
          message: 'scrambled y correctOrder deben tener la misma longitud',
        }),
    )
    .min(1),
})

export const flashcardsSchema = z.object({
  items: z.array(z.object({ front: z.string().min(1), back: z.string().min(1) })).min(1),
})

export type MultipleChoiceContent = z.infer<typeof multipleChoiceSchema>
export type FillBlanksContent = z.infer<typeof fillBlanksSchema>
export type MatchingContent = z.infer<typeof matchingSchema>
export type OrderWordsContent = z.infer<typeof orderWordsSchema>
export type FlashcardsContent = z.infer<typeof flashcardsSchema>
export type ExerciseContent =
  | MultipleChoiceContent
  | FillBlanksContent
  | MatchingContent
  | OrderWordsContent
  | FlashcardsContent

const byType = {
  MULTIPLE_CHOICE: multipleChoiceSchema,
  FILL_BLANKS: fillBlanksSchema,
  MATCHING: matchingSchema,
  ORDER_WORDS: orderWordsSchema,
  FLASHCARDS: flashcardsSchema,
} as const

export function exerciseSchemaFor(type: ExerciseType) {
  return byType[type]
}

export function parseExerciseContent(type: ExerciseType, raw: unknown) {
  return byType[type].parse(raw)
}

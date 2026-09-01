import { z } from 'zod'

export const guidedOpenerSchema = z.object({
  assistantPrompt: z.string().min(1),
})

export const turnReviewSchema = z.object({
  correctedText: z.string().min(1),
  naturalVersion: z.string().min(1),
  fluencyTip: z.string().min(1),
  nextAssistantPrompt: z.string().min(1).nullable(),
})

export type GuidedOpener = z.infer<typeof guidedOpenerSchema>
export type TurnReview = z.infer<typeof turnReviewSchema>

export function parseGuidedOpener(raw: unknown): GuidedOpener {
  return guidedOpenerSchema.parse(raw)
}
export function parseTurnReview(raw: unknown): TurnReview {
  return turnReviewSchema.parse(raw)
}

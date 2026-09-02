import { z } from 'zod'

export const vocabEnrichmentSchema = z.object({
  translation: z.string().trim().min(1),
  meaning: z.string().trim().min(1),
  partOfSpeech: z.string().trim().min(1),
  ipa: z.string().trim().min(1),
  examples: z.array(z.string().trim().min(1)).min(3),
})

export type VocabEnrichment = z.infer<typeof vocabEnrichmentSchema>

export function parseVocabEnrichment(raw: unknown): VocabEnrichment {
  return vocabEnrichmentSchema.parse(raw)
}

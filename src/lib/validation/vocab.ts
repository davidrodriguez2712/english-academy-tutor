import { z } from 'zod'

export const vocabEnrichmentSchema = z.object({
  translation: z.string().min(1),
  meaning: z.string().min(1),
  partOfSpeech: z.string().min(1),
  ipa: z.string().min(1),
  examples: z.array(z.string().min(1)).min(3),
})

export type VocabEnrichment = z.infer<typeof vocabEnrichmentSchema>

export function parseVocabEnrichment(raw: unknown): VocabEnrichment {
  return vocabEnrichmentSchema.parse(raw)
}

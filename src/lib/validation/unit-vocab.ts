import { z } from 'zod'
import { vocabEnrichmentSchema } from './vocab'

// Un término del vocabulario de una unidad: el enriquecimiento habitual + la
// palabra o expresión en inglés tal como aparece en el texto.
export const unitVocabWordSchema = vocabEnrichmentSchema.extend({
  word: z.string().trim().min(1),
})

export const unitVocabSchema = z.object({
  items: z.array(unitVocabWordSchema).min(1),
})

export type UnitVocabWord = z.infer<typeof unitVocabWordSchema>
export type UnitVocabContent = z.infer<typeof unitVocabSchema>

export function parseUnitVocab(raw: unknown): UnitVocabContent {
  return unitVocabSchema.parse(raw)
}

import type { VocabEntry } from '@prisma/client'

export function normalizeWord(raw: string): string {
  const n = raw.trim().toLowerCase().replace(/\s+/g, ' ')
  if (!n) throw new Error('palabra vacía')
  return n
}

function isNonEmptyStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((e) => typeof e === 'string' && e.trim().length > 0)
}

export function serializeExamples(examples: string[]): string {
  if (!isNonEmptyStringArray(examples) || examples.length < 3) {
    throw new Error('se requieren al menos 3 ejemplos no vacíos')
  }
  return JSON.stringify(examples)
}

export function deserializeExamples(raw: string): string[] {
  const parsed = JSON.parse(raw)
  if (!isNonEmptyStringArray(parsed) || parsed.length < 3) {
    throw new Error('ejemplos inválidos en base de datos')
  }
  return parsed
}

export type VocabEntryDTO = Omit<VocabEntry, 'examples' | 'word'> & { examples: string[] }

export function toVocabDTO(entry: VocabEntry): VocabEntryDTO {
  const { examples, word: _word, ...rest } = entry
  void _word
  return { ...rest, examples: deserializeExamples(examples) }
}

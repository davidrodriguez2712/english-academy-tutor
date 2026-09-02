import { parseUnitVocab, type UnitVocabContent } from '@/lib/validation/unit-vocab'

export function serializeUnitVocab(content: unknown): string {
  return JSON.stringify(parseUnitVocab(content))
}

export function deserializeUnitVocab(raw: string): UnitVocabContent {
  return parseUnitVocab(JSON.parse(raw))
}

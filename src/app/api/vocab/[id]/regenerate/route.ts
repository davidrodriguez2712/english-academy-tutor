import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { isAiEnabled } from '@/lib/ai/config'
import { enrichVocab, AiError } from '@/lib/ai'
import { serializeExamples, toVocabDTO } from '@/lib/vocab/entry'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const existing = await prisma.vocabEntry.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Palabra no encontrada' }, { status: 404 })

  if (!isAiEnabled()) {
    return NextResponse.json(
      { error: 'La IA está desactivada (falta OPENAI_API_KEY)' },
      { status: 503 },
    )
  }

  let enrichment
  try {
    enrichment = await enrichVocab(existing.displayWord)
  } catch (err) {
    if (err instanceof AiError) {
      return NextResponse.json(
        { error: 'No se pudo regenerar la ficha, inténtalo de nuevo' },
        { status: 502 },
      )
    }
    throw err
  }

  const entry = await prisma.vocabEntry.update({
    where: { id },
    data: {
      translation: enrichment.translation,
      meaning: enrichment.meaning,
      partOfSpeech: enrichment.partOfSpeech,
      ipa: enrichment.ipa,
      examples: serializeExamples(enrichment.examples),
    },
  })
  return NextResponse.json({ entry: toVocabDTO(entry) })
}

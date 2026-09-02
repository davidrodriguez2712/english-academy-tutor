import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { isAiEnabled } from '@/lib/ai/config'
import { enrichVocab, AiError } from '@/lib/ai'
import { normalizeWord, serializeExamples, toVocabDTO } from '@/lib/vocab/entry'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const q = url.searchParams.get('q')?.trim().toLowerCase() ?? ''
  const status = url.searchParams.get('status') ?? ''

  const where: {
    status?: 'IN_PROGRESS' | 'LEARNED'
    OR?: { word?: { contains: string }; translation?: { contains: string } }[]
  } = {}
  if (q) where.OR = [{ word: { contains: q } }, { translation: { contains: q } }]
  if (status === 'IN_PROGRESS' || status === 'LEARNED') where.status = status

  const entries = await prisma.vocabEntry.findMany({ where, orderBy: { createdAt: 'desc' } })
  return NextResponse.json({ entries: entries.map(toVocabDTO) })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const rawWord = typeof body?.word === 'string' ? body.word : ''

  let word: string
  try {
    word = normalizeWord(rawWord)
  } catch {
    return NextResponse.json({ error: 'Escribe una palabra o expresión' }, { status: 400 })
  }

  if (word.length > 100) {
    return NextResponse.json(
      { error: 'La palabra o expresión es demasiado larga' },
      { status: 400 },
    )
  }

  const existing = await prisma.vocabEntry.findUnique({ where: { word } })
  if (existing) {
    return NextResponse.json({ error: 'Esa palabra ya está en tu lista' }, { status: 409 })
  }

  if (!isAiEnabled()) {
    return NextResponse.json(
      { error: 'La IA está desactivada (falta OPENAI_API_KEY)' },
      { status: 503 },
    )
  }

  let enrichment
  try {
    enrichment = await enrichVocab(rawWord.trim())
  } catch (err) {
    if (err instanceof AiError) {
      return NextResponse.json(
        { error: 'No se pudo generar la ficha, inténtalo de nuevo' },
        { status: 502 },
      )
    }
    throw err
  }

  const entry = await prisma.vocabEntry.create({
    data: {
      word,
      displayWord: rawWord.trim(),
      translation: enrichment.translation,
      meaning: enrichment.meaning,
      partOfSpeech: enrichment.partOfSpeech,
      ipa: enrichment.ipa,
      examples: serializeExamples(enrichment.examples),
    },
  })
  return NextResponse.json({ entry: toVocabDTO(entry) }, { status: 201 })
}

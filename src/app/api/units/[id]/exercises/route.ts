import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { isAiEnabled } from '@/lib/ai/config'
import { generateExercises, AiError } from '@/lib/ai'
import { isExerciseType } from '@/lib/exercise-types'
import { serializeContent, deserializeContent } from '@/lib/exercises/exercise-set'
import { sliceUnitPages } from '@/lib/pdf'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const url = new URL(req.url)
  const type = url.searchParams.get('type') ?? ''
  const regenerate = url.searchParams.get('regenerate') === '1'
  if (!isExerciseType(type)) {
    return NextResponse.json({ error: 'Tipo de ejercicio inválido' }, { status: 400 })
  }

  const unit = await prisma.unit.findUnique({ where: { id }, include: { book: true } })
  if (!unit) return NextResponse.json({ error: 'Unidad no encontrada' }, { status: 404 })

  // "Continuar" en el home ordena por lastOpenedAt: hay que actualizarlo tanto
  // si se sirve la caché como si se genera.
  await prisma.unit.update({ where: { id }, data: { lastOpenedAt: new Date() } })

  const existing = await prisma.exerciseSet.findUnique({
    where: { unitId_type: { unitId: id, type } },
  })
  if (existing && !regenerate) {
    return NextResponse.json({
      id: existing.id,
      type,
      content: deserializeContent(type, existing.content),
    })
  }

  if (!isAiEnabled()) {
    return NextResponse.json(
      { error: 'La IA está desactivada (falta OPENAI_API_KEY)' },
      { status: 503 },
    )
  }

  let serialized: string
  try {
    const usePages = type === 'MULTIPLE_CHOICE' || type === 'FILL_BLANKS'
    const pages = usePages
      ? sliceUnitPages(JSON.parse(unit.book.rawText) as string[], unit.startPage, unit.endPage)
      : undefined
    const content = await generateExercises(unit.extractedText, type, { pages })
    serialized = serializeContent(type, content)
  } catch (err) {
    if (err instanceof AiError) {
      return NextResponse.json(
        { error: 'No se pudo generar el ejercicio, inténtalo de nuevo' },
        { status: 502 },
      )
    }
    throw err
  }

  const set = await prisma.exerciseSet.upsert({
    where: { unitId_type: { unitId: id, type } },
    create: { unitId: id, type, content: serialized },
    update: { content: serialized, generatedAt: new Date() },
  })
  return NextResponse.json({ id: set.id, type, content: deserializeContent(type, serialized) })
}

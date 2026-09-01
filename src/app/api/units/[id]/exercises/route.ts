import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { isAiEnabled } from '@/lib/ai/config'
import { generateExercises, AiError } from '@/lib/ai'
import { isExerciseType } from '@/lib/exercise-types'
import { serializeContent, deserializeContent } from '@/lib/exercises/exercise-set'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const url = new URL(req.url)
  const type = url.searchParams.get('type') ?? ''
  const regenerate = url.searchParams.get('regenerate') === '1'
  if (!isExerciseType(type)) {
    return NextResponse.json({ error: 'Tipo de ejercicio inválido' }, { status: 400 })
  }

  const unit = await prisma.unit.findUnique({ where: { id } })
  if (!unit) return NextResponse.json({ error: 'Unidad no encontrada' }, { status: 404 })

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
    const content = await generateExercises(unit.extractedText, type)
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
  await prisma.unit.update({ where: { id }, data: { lastOpenedAt: new Date() } })

  return NextResponse.json({ id: set.id, type, content: deserializeContent(type, serialized) })
}

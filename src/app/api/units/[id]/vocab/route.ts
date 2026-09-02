import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { isAiEnabled } from '@/lib/ai/config'
import { generateUnitVocab, AiError } from '@/lib/ai'
import { serializeUnitVocab, deserializeUnitVocab } from '@/lib/unit-vocab/content'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const regenerate = new URL(req.url).searchParams.get('regenerate') === '1'

  const unit = await prisma.unit.findUnique({ where: { id } })
  if (!unit) return NextResponse.json({ error: 'Unidad no encontrada' }, { status: 404 })

  await prisma.unit.update({ where: { id }, data: { lastOpenedAt: new Date() } })

  const existing = await prisma.unitVocab.findUnique({ where: { unitId: id } })
  if (existing && !regenerate) {
    return NextResponse.json({ content: deserializeUnitVocab(existing.content) })
  }

  if (!isAiEnabled()) {
    return NextResponse.json(
      { error: 'La IA está desactivada (falta OPENAI_API_KEY)' },
      { status: 503 },
    )
  }

  let serialized: string
  try {
    const content = await generateUnitVocab(unit.extractedText)
    serialized = serializeUnitVocab(content)
  } catch (err) {
    if (err instanceof AiError) {
      return NextResponse.json(
        { error: 'No se pudo generar el vocabulario, inténtalo de nuevo' },
        { status: 502 },
      )
    }
    throw err
  }

  await prisma.unitVocab.upsert({
    where: { unitId: id },
    create: { unitId: id, content: serialized },
    update: { content: serialized, generatedAt: new Date() },
  })
  return NextResponse.json({ content: deserializeUnitVocab(serialized) })
}

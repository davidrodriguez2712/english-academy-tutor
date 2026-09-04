import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { toVocabDTO } from '@/lib/vocab/entry'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json().catch(() => null)

  const data: { status?: 'IN_PROGRESS' | 'LEARNED'; category?: string | null } = {}
  if (body?.status === 'IN_PROGRESS' || body?.status === 'LEARNED') data.status = body.status
  if (typeof body?.category === 'string') data.category = body.category.trim() || null

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 })
  }

  const existing = await prisma.vocabEntry.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Palabra no encontrada' }, { status: 404 })

  const entry = await prisma.vocabEntry.update({ where: { id }, data })
  return NextResponse.json({ entry: toVocabDTO(entry) })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const existing = await prisma.vocabEntry.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Palabra no encontrada' }, { status: 404 })

  await prisma.vocabEntry.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}

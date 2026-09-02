import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { toVocabDTO } from '@/lib/vocab/entry'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json().catch(() => null)
  const status = body?.status
  if (status !== 'IN_PROGRESS' && status !== 'LEARNED') {
    return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })
  }
  const existing = await prisma.vocabEntry.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Palabra no encontrada' }, { status: 404 })

  const entry = await prisma.vocabEntry.update({ where: { id }, data: { status } })
  return NextResponse.json({ entry: toVocabDTO(entry) })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const existing = await prisma.vocabEntry.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Palabra no encontrada' }, { status: 404 })

  await prisma.vocabEntry.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}

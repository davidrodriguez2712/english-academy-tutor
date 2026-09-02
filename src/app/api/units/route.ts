import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { validateUnitInput } from '@/lib/units'
import { sliceUnitText } from '@/lib/pdf'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { bookId, title, startPage, endPage, level } = body ?? {}
  const book = await prisma.book.findUnique({ where: { id: bookId } })
  if (!book) return NextResponse.json({ error: 'Libro no encontrado' }, { status: 404 })

  const check = validateUnitInput({ title: String(title ?? ''), startPage, endPage }, book)
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 })

  const pages: string[] = JSON.parse(book.rawText)
  const unit = await prisma.unit.create({
    data: {
      bookId,
      title: String(title).trim(),
      startPage,
      endPage,
      level: level ? String(level) : null,
      extractedText: sliceUnitText(pages, startPage, endPage),
    },
  })
  return NextResponse.json({ id: unit.id })
}

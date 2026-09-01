import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { saveBookFile } from '@/lib/storage'
import { extractPdf } from '@/lib/pdf'

const MAX_BYTES = 25 * 1024 * 1024

export async function POST(req: NextRequest) {
  const form = await req.formData()
  const file = form.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Falta el archivo' }, { status: 400 })
  }
  if (file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'El archivo debe ser un PDF' }, { status: 400 })
  }
  const bytes = Buffer.from(await file.arrayBuffer())
  if (bytes.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: 'El PDF supera los 25 MB' }, { status: 400 })
  }

  let extracted
  try {
    extracted = await extractPdf(new Uint8Array(bytes))
  } catch {
    return NextResponse.json(
      { error: 'Este PDF no tiene texto seleccionable, no puedo procesarlo' },
      { status: 400 },
    )
  }

  const { filename } = await saveBookFile(bytes, file.name)
  const book = await prisma.book.create({
    data: {
      title: file.name.replace(/\.pdf$/i, ''),
      filename,
      pageCount: extracted.totalPages,
      rawText: JSON.stringify(extracted.pages),
    },
  })
  return NextResponse.json({ id: book.id })
}

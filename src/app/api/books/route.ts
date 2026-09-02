import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { saveBookFile } from '@/lib/storage'
import { extractPdf } from '@/lib/pdf'

// Límite configurable por si necesitas subir un PDF grande (por defecto 100 MB).
// El archivo se bufferiza entero en memoria para extraer el texto, así que no
// conviene subirlo mucho más alto.
const MAX_BYTES = (Number(process.env.MAX_PDF_MB) || 100) * 1024 * 1024

export async function POST(req: NextRequest) {
  const form = await req.formData()
  const file = form.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Falta el archivo' }, { status: 400 })
  }
  if (file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'El archivo debe ser un PDF' }, { status: 400 })
  }
  // Rechaza por tamaño ANTES de bufferizar el archivo entero.
  if (file.size > MAX_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1)
    const max = Math.round(MAX_BYTES / 1024 / 1024)
    return NextResponse.json(
      { error: `El PDF pesa ${mb} MB y el límite es ${max} MB. Comprímelo o sube solo los capítulos que necesites.` },
      { status: 413 },
    )
  }

  const bytes = Buffer.from(await file.arrayBuffer())

  let extracted
  try {
    extracted = await extractPdf(new Uint8Array(bytes))
  } catch (err) {
    const noText = err instanceof Error && err.message === 'PDF sin texto extraíble'
    return NextResponse.json(
      {
        error: noText
          ? 'Este PDF no tiene texto seleccionable (parece escaneado). Necesito un PDF con texto real, no imágenes.'
          : 'No se pudo leer el PDF. Puede estar dañado o protegido con contraseña.',
      },
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

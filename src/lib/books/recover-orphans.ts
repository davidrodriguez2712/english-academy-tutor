import { prisma } from '@/lib/db'
import { extractPdf } from '@/lib/pdf'
import { listBookFiles, readBookFile } from '@/lib/storage'

const UUID_PREFIX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/i

export function titleFromFilename(filename: string): string {
  const withoutExt = filename.replace(/\.pdf$/i, '')
  const withoutPrefix = withoutExt.replace(UUID_PREFIX, '')
  return withoutPrefix || withoutExt
}

export type RecoverOrphansResult = {
  recovered: string[]
  failed: { filename: string; error: string }[]
}

/**
 * Un libro queda huérfano cuando su PDF se guardó en disco pero el
 * `prisma.book.create` correspondiente nunca llegó a ejecutarse (p. ej. el
 * proceso murió a mitad de la subida). Esto reconstruye el registro en BD a
 * partir del PDF que ya está en disco, para no perder el trabajo de subida.
 */
export async function recoverOrphanBooks(): Promise<RecoverOrphansResult> {
  const files = await listBookFiles()
  const existing = await prisma.book.findMany({ select: { filename: true } })
  const known = new Set(existing.map((b) => b.filename))
  const orphans = files.filter((f) => !known.has(f))

  const recovered: string[] = []
  const failed: { filename: string; error: string }[] = []

  for (const filename of orphans) {
    try {
      const bytes = await readBookFile(filename)
      const extracted = await extractPdf(new Uint8Array(bytes))
      await prisma.book.create({
        data: {
          title: titleFromFilename(filename),
          filename,
          pageCount: extracted.totalPages,
          rawText: JSON.stringify(extracted.pages),
        },
      })
      recovered.push(filename)
    } catch (err) {
      failed.push({ filename, error: err instanceof Error ? err.message : String(err) })
    }
  }

  return { recovered, failed }
}

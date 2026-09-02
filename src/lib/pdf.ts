import { extractText, getDocumentProxy } from 'unpdf'

export async function extractPdf(
  bytes: Uint8Array,
): Promise<{ pages: string[]; totalPages: number }> {
  const pdf = await getDocumentProxy(bytes)
  const { text, totalPages } = await extractText(pdf, { mergePages: false })
  const pages = (text as string[]).map((t) => t.trim())
  if (pages.every((p) => p === '')) {
    throw new Error('PDF sin texto extraíble')
  }
  return { pages, totalPages }
}

export function sliceUnitText(pages: string[], startPage: number, endPage: number): string {
  if (startPage < 1 || startPage > endPage) {
    throw new Error('rango de páginas inválido')
  }
  const from = startPage - 1
  const to = Math.min(endPage, pages.length)
  return pages.slice(from, to).join('\n\n')
}

export type PageSlice = { page: number; text: string }

export function sliceUnitPages(
  pages: string[],
  startPage: number,
  endPage: number,
): PageSlice[] {
  if (startPage < 1 || startPage > endPage) {
    throw new Error('rango de páginas inválido')
  }
  const to = Math.min(endPage, pages.length)
  const out: PageSlice[] = []
  for (let p = startPage; p <= to; p++) {
    const text = pages[p - 1]?.trim()
    if (text) out.push({ page: p, text })
  }
  return out
}

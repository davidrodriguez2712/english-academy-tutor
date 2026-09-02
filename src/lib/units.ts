export function validateUnitInput(
  input: { title: string; startPage: number; endPage: number },
  book: { pageCount: number },
): { ok: true } | { ok: false; error: string } {
  if (!input.title.trim()) return { ok: false, error: 'El título es obligatorio' }
  if (!Number.isInteger(input.startPage) || input.startPage < 1)
    return { ok: false, error: 'Página de inicio inválida' }
  if (!Number.isInteger(input.endPage) || input.endPage < input.startPage)
    return { ok: false, error: 'Página final inválida' }
  if (input.endPage > book.pageCount)
    return { ok: false, error: `El libro tiene ${book.pageCount} páginas` }
  return { ok: true }
}

import { describe, it, expect, afterEach, beforeEach } from 'vitest'
import { copyFile, mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { prisma } from '@/lib/db'
import { BOOKS_DIR } from '@/lib/storage'
import { recoverOrphanBooks, titleFromFilename } from './recover-orphans'

describe('titleFromFilename', () => {
  it('quita el prefijo uuid y la extensión .pdf', () => {
    expect(
      titleFromFilename('ca704f65-6970-4529-8b7b-99a2912bf590-book_navigate_ocr.pdf'),
    ).toBe('book_navigate_ocr')
  })

  it('sin prefijo uuid, solo quita la extensión', () => {
    expect(titleFromFilename('mi_libro.pdf')).toBe('mi_libro')
  })
})

describe('recoverOrphanBooks', () => {
  beforeEach(async () => {
    await mkdir(BOOKS_DIR, { recursive: true })
  })

  afterEach(async () => {
    await prisma.book.deleteMany({ where: { title: 'sample' } })
    await rm(BOOKS_DIR, { recursive: true, force: true })
  })

  it('reconstruye el registro de un PDF huérfano (guardado en disco sin fila en BD)', async () => {
    const filename = 'orphan-sample.pdf'
    await copyFile('test/fixtures/sample.pdf', join(BOOKS_DIR, filename))

    const result = await recoverOrphanBooks()

    expect(result.recovered).toContain(filename)
    expect(result.failed).toEqual([])

    const book = await prisma.book.findFirst({ where: { filename } })
    expect(book).not.toBeNull()
    expect(book?.pageCount).toBe(2)
  })

  it('no toca los libros que ya tienen fila en BD', async () => {
    const filename = 'known-sample.pdf'
    await copyFile('test/fixtures/sample.pdf', join(BOOKS_DIR, filename))
    const created = await prisma.book.create({
      data: { title: 'sample', filename, pageCount: 2, rawText: '[]' },
    })

    const result = await recoverOrphanBooks()

    expect(result.recovered).not.toContain(filename)
    const count = await prisma.book.count({ where: { filename } })
    expect(count).toBe(1)

    await prisma.book.delete({ where: { id: created.id } })
  })
})

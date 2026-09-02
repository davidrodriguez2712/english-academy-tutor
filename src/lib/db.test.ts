import { describe, it, expect, afterAll } from 'vitest'
import { prisma } from './db'

describe('prisma client', () => {
  it('crea y borra un Book', async () => {
    const book = await prisma.book.create({
      data: { title: 'T', filename: 'f.pdf', pageCount: 1, rawText: 'x' },
    })
    expect(book.id).toBeTruthy()
    await prisma.book.delete({ where: { id: book.id } })
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })
})

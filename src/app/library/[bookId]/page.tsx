import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { Card } from '@/components/ui/Card'
import { AddUnitForm } from '@/components/library/AddUnitForm'

export const dynamic = 'force-dynamic'

export default async function BookPage({ params }: { params: Promise<{ bookId: string }> }) {
  const { bookId } = await params
  const book = await prisma.book.findUnique({
    where: { id: bookId },
    include: { units: { orderBy: { startPage: 'asc' } } },
  })
  if (!book) notFound()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{book.title}</h1>
      <p style={{ color: 'var(--muted)' }}>{book.pageCount} páginas</p>
      <Card><AddUnitForm bookId={book.id} /></Card>
      <div className="space-y-3">
        {book.units.map((u) => (
          <Card key={u.id}>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{u.title}</div>
                <div className="text-sm" style={{ color: 'var(--muted)' }}>
                  Págs. {u.startPage}–{u.endPage}{u.level ? ` · ${u.level}` : ''}
                </div>
              </div>
              <div className="flex gap-2">
                <Link href={`/learn/${u.id}`} className="text-sm" style={{ color: 'var(--primary)' }}>Estudiar</Link>
                <Link href={`/speaking?unitId=${u.id}`} className="text-sm" style={{ color: 'var(--primary)' }}>Practicar speaking</Link>
              </div>
            </div>
          </Card>
        ))}
        {book.units.length === 0 && <p style={{ color: 'var(--muted)' }}>Aún no hay unidades.</p>}
      </div>
    </div>
  )
}

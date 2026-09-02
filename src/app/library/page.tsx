import Link from 'next/link'
import { prisma } from '@/lib/db'
import { Card } from '@/components/ui/Card'
import { UploadBookForm } from '@/components/library/UploadBookForm'

export const dynamic = 'force-dynamic'

export default async function LibraryPage() {
  const books = await prisma.book.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { units: true } } },
  })
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Biblioteca</h1>
      <Card><UploadBookForm /></Card>
      <div className="grid grid-cols-2 gap-4">
        {books.map((b) => (
          <Link key={b.id} href={`/library/${b.id}`}>
            <Card>
              <div className="font-medium">{b.title}</div>
              <div className="text-sm" style={{ color: 'var(--muted)' }}>
                {b.pageCount} páginas · {b._count.units} unidades
              </div>
            </Card>
          </Link>
        ))}
        {books.length === 0 && <p style={{ color: 'var(--muted)' }}>Aún no has subido ningún libro.</p>}
      </div>
    </div>
  )
}

import Link from 'next/link'
import { prisma } from '@/lib/db'
import { Card } from '@/components/ui/Card'

export const dynamic = 'force-dynamic'

export default async function LearnPage() {
  const units = await prisma.unit.findMany({
    orderBy: { createdAt: 'desc' },
    include: { book: true },
  })
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Aprender</h1>
      {units.length === 0 && (
        <p style={{ color: 'var(--muted)' }}>
          No hay unidades. Ve a <Link href="/library" style={{ color: 'var(--primary)' }}>Biblioteca</Link> y crea una.
        </p>
      )}
      <div className="grid grid-cols-2 gap-4">
        {units.map((u) => (
          <Link key={u.id} href={`/learn/${u.id}`}>
            <Card>
              <div className="font-medium">{u.title}</div>
              <div className="text-sm" style={{ color: 'var(--muted)' }}>
                {u.book.title} · págs. {u.startPage}–{u.endPage}
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/db'
import { ExerciseRunner } from '@/components/exercises/ExerciseRunner'

export const dynamic = 'force-dynamic'

export default async function UnitLearnPage({ params }: { params: Promise<{ unitId: string }> }) {
  const { unitId } = await params
  const unit = await prisma.unit.findUnique({ where: { id: unitId }, include: { book: true } })
  if (!unit) notFound()
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{unit.title}</h1>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          {unit.book.title} · <Link href={`/speaking?unitId=${unit.id}`} style={{ color: 'var(--primary)' }}>practicar speaking</Link>
        </p>
      </div>
      <ExerciseRunner unitId={unit.id} />
    </div>
  )
}

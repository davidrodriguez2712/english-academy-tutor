import { Suspense } from 'react'
import { prisma } from '@/lib/db'
import { StartSessionForm } from '@/components/speaking/StartSessionForm'

export const dynamic = 'force-dynamic'

export default async function SpeakingPage() {
  const units = await prisma.unit.findMany({ orderBy: { createdAt: 'desc' }, select: { id: true, title: true } })
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Practicar speaking</h1>
      <Suspense>
        <StartSessionForm units={units} />
      </Suspense>
    </div>
  )
}

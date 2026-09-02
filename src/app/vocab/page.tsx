import { prisma } from '@/lib/db'
import { toVocabDTO } from '@/lib/vocab/entry'
import { VocabTable } from '@/components/vocab/VocabTable'

export const dynamic = 'force-dynamic'

export default async function VocabPage() {
  const rows = await prisma.vocabEntry.findMany({ orderBy: { createdAt: 'desc' } })
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Vocabulario</h1>
      <VocabTable initial={rows.map(toVocabDTO)} />
    </div>
  )
}

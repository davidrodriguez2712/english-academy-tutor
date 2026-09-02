import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { TurnView } from '@/components/speaking/TurnView'
import { SessionSummary } from '@/components/speaking/SessionSummary'

export const dynamic = 'force-dynamic'

export default async function SessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params
  const session = await prisma.speakingSession.findUnique({
    where: { id: sessionId },
    include: { turns: { orderBy: { index: 'asc' } } },
  })
  if (!session) notFound()

  if (session.status === 'COMPLETED') {
    return <SessionSummary session={session} />
  }

  const open = session.turns.find((t) => !t.userTranscript) ?? session.turns[session.turns.length - 1]
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Sesión de speaking</h1>
      <p className="text-sm" style={{ color: 'var(--muted)' }}>Tema: {session.topic}</p>
      <TurnView
        key={open.id}
        sessionId={session.id}
        mode={session.mode}
        totalTurns={session.totalTurns}
        openTurn={{ index: open.index, assistantPrompt: open.assistantPrompt, assistantAudioPath: open.assistantAudioPath }}
      />
    </div>
  )
}

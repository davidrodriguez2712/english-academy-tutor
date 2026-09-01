import Link from 'next/link'
import type { SpeakingSession, SpeakingTurn } from '@prisma/client'
import { Card } from '@/components/ui/Card'

export function SessionSummary({
  session,
}: {
  session: SpeakingSession & { turns: SpeakingTurn[] }
}) {
  const done = session.turns.filter((t) => t.userTranscript).sort((a, b) => a.index - b.index)
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Sesión completada</h1>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          Tema: {session.topic} · {done.length} turnos · +{session.xpEarned} XP
        </p>
      </div>

      {done.map((t) => (
        <Card key={t.id}>
          <div className="space-y-2 text-sm">
            <div className="font-medium">{session.mode === 'GUIDED' ? `Turno ${t.index}` : 'Monólogo'}: {t.assistantPrompt}</div>
            <div><span style={{ color: 'var(--muted)' }}>Lo que dijiste: </span>{t.userTranscript}</div>
            <div><span style={{ color: 'var(--muted)' }}>Corrección: </span>{t.correctedText}</div>
            <div><span style={{ color: 'var(--muted)' }}>Versión natural: </span>{t.naturalVersion}</div>
            <div><span style={{ color: 'var(--muted)' }}>Tip: </span>{t.fluencyTip}</div>
            <div className="flex flex-wrap gap-4 pt-1">
              {t.userAudioPath && <audio controls src={`/api/audio/${t.userAudioPath}`} />}
              {t.correctionAudioPath && <audio controls src={`/api/audio/${t.correctionAudioPath}`} />}
            </div>
          </div>
        </Card>
      ))}

      <Link href="/speaking" style={{ color: 'var(--primary)' }}>Nueva sesión</Link>
    </div>
  )
}

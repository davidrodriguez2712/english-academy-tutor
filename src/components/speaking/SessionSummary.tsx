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
          <div className="space-y-3 text-sm">
            <div className="font-medium">{session.mode === 'GUIDED' ? `Turno ${t.index}` : 'Monólogo'}: {t.assistantPrompt}</div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <div className="font-medium">Lo que dijiste</div>
                <p>{t.userTranscript}</p>
                {t.userAudioPath && <audio controls src={`/api/audio/${t.userAudioPath}`} />}
              </div>
              <div className="space-y-2">
                <div>
                  <div className="font-medium">Corrección sugerida</div>
                  <p>{t.correctedText}</p>
                </div>
                <div>
                  <div className="font-medium">Más natural</div>
                  <p>{t.naturalVersion}</p>
                  {t.naturalAudioPath && <audio controls src={`/api/audio/${t.naturalAudioPath}`} />}
                </div>
                <div><span style={{ color: 'var(--muted)' }}>Tip: </span>{t.fluencyTip}</div>
              </div>
            </div>
          </div>
        </Card>
      ))}

      <Link href="/speaking" style={{ color: 'var(--primary)' }}>Nueva sesión</Link>
    </div>
  )
}

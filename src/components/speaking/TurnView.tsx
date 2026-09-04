'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { errorFrom } from '@/lib/http'
import { AudioRecorder } from './AudioRecorder'
import { TurnFeedback } from './TurnFeedback'

type OpenTurn = { index: number; assistantPrompt: string; assistantAudioPath: string | null }

export function TurnView({
  sessionId,
  mode,
  totalTurns,
  openTurn,
}: {
  sessionId: string
  mode: 'GUIDED' | 'MONOLOGUE'
  totalTurns: number
  openTurn: OpenTurn
}) {
  const router = useRouter()
  const [phase, setPhase] = useState<'record' | 'sending' | 'result' | 'error'>('record')
  const [error, setError] = useState<string | null>(null)
  const [pendingBlob, setPendingBlob] = useState<Blob | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [result, setResult] = useState<any>(null)

  async function send(blob: Blob) {
    setPendingBlob(blob)
    setPhase('sending')
    setError(null)
    const fd = new FormData()
    fd.append('audio', blob, 'turn.webm')
    const res = await fetch(`/api/speaking/sessions/${sessionId}/turns`, { method: 'POST', body: fd })
    if (!res.ok) {
      setError(await errorFrom(res))
      setPhase('error')
      return
    }
    setResult(await res.json())
    setPhase('result')
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <div className="space-y-3">
          <div className="text-sm" style={{ color: 'var(--muted)' }}>
            {mode === 'GUIDED' ? `Turno ${openTurn.index} de ${totalTurns}` : 'Monólogo'}
          </div>
          <p className="font-medium">{openTurn.assistantPrompt}</p>
          {openTurn.assistantAudioPath && (
            <audio controls src={`/api/audio/${openTurn.assistantAudioPath}`} />
          )}

          {phase === 'record' && <AudioRecorder onSubmit={send} />}
          {phase === 'sending' && <Spinner label="Transcribiendo y analizando…" />}
          {phase === 'error' && (
            <div className="space-y-2">
              <p style={{ color: 'var(--warning)' }}>{error}</p>
              <Button onClick={() => pendingBlob && send(pendingBlob)}>Reintentar</Button>
            </div>
          )}
          {phase === 'result' && result && (
            <div className="space-y-3 border-t pt-3" style={{ borderColor: 'var(--border)' }}>
              <div className="font-medium">Lo que dijiste</div>
              <p>{result.turn.userTranscript}</p>
              {result.turn.userAudioPath && (
                <audio controls src={`/api/audio/${result.turn.userAudioPath}`}>Escuchar tu audio</audio>
              )}
            </div>
          )}
          {phase === 'result' && (
            <Button
              onClick={() =>
                result.sessionStatus === 'COMPLETED'
                  ? router.push(`/speaking/${sessionId}?done=1`)
                  : router.refresh()
              }
            >
              {result.sessionStatus === 'COMPLETED' ? 'Ver resumen' : 'Siguiente turno'}
            </Button>
          )}
        </div>
      </Card>

      {phase === 'result' && result && (
        <Card>
          <TurnFeedback fb={result.turn} />
          {mode === 'GUIDED' && result.turn.nextAssistantPrompt && (
            <div className="mt-3 border-t pt-3 text-sm" style={{ borderColor: 'var(--border)' }}>
              <div className="font-medium">Siguiente pregunta</div>
              <p style={{ color: 'var(--muted)' }}>{result.turn.nextAssistantPrompt}</p>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}

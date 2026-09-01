'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { AudioRecorder } from './AudioRecorder'
import { TurnFeedback } from './TurnFeedback'
import { TurnTabs } from './TurnTabs'

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
      setError((await res.json()).error ?? 'Error')
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
        <div className="space-y-4">
          <Card><TurnFeedback fb={result.turn} /></Card>
          <Card>
            <TurnTabs
              said={result.turn.userTranscript}
              natural={result.turn.naturalVersion}
              aiReply={mode === 'GUIDED' ? result.turn.nextAssistantPrompt : null}
            />
          </Card>
        </div>
      )}
    </div>
  )
}

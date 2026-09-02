'use client'
type Feedback = {
  correctedText: string
  naturalVersion: string
  fluencyTip: string
  correctionAudioPath: string | null
}
export function TurnFeedback({ fb }: { fb: Feedback }) {
  return (
    <div className="space-y-3 text-sm">
      <div><div className="font-medium">Corrección sugerida</div><p>{fb.correctedText}</p></div>
      <div><div className="font-medium">Más natural</div><p>{fb.naturalVersion}</p></div>
      <div><div className="font-medium">Tip de fluidez</div><p style={{ color: 'var(--muted)' }}>{fb.fluencyTip}</p></div>
      {fb.correctionAudioPath && (
        <audio controls src={`/api/audio/${fb.correctionAudioPath}`}>Escuchar corrección</audio>
      )}
    </div>
  )
}

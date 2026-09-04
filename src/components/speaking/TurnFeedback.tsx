'use client'
type Feedback = {
  correctedText: string
  naturalVersion: string
  fluencyTip: string
  naturalAudioPath: string | null
}
export function TurnFeedback({ fb }: { fb: Feedback }) {
  return (
    <div className="space-y-3 text-sm">
      <div><div className="font-medium">Corrección sugerida</div><p>{fb.correctedText}</p></div>
      <div>
        <div className="font-medium">Más natural</div>
        <p>{fb.naturalVersion}</p>
        {fb.naturalAudioPath && (
          <audio className="mt-1" controls src={`/api/audio/${fb.naturalAudioPath}`}>Escuchar versión natural</audio>
        )}
      </div>
      <div><div className="font-medium">Tip de fluidez</div><p style={{ color: 'var(--muted)' }}>{fb.fluencyTip}</p></div>
    </div>
  )
}

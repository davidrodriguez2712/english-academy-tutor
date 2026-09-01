'use client'
import { useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'

export function AudioRecorder({
  onSubmit,
  disabled,
}: {
  onSubmit: (blob: Blob) => void
  disabled?: boolean
}) {
  const [state, setState] = useState<'idle' | 'recording' | 'recorded'>('idle')
  const [url, setUrl] = useState<string | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const blobRef = useRef<Blob | null>(null)

  async function start() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const rec = new MediaRecorder(stream, { mimeType: 'audio/webm' })
    chunksRef.current = []
    rec.ondataavailable = (e) => chunksRef.current.push(e.data)
    rec.onstop = () => {
      stream.getTracks().forEach((t) => t.stop())
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
      blobRef.current = blob
      setUrl(URL.createObjectURL(blob))
      setState('recorded')
    }
    recorderRef.current = rec
    rec.start()
    setState('recording')
  }

  function stop() {
    recorderRef.current?.stop()
  }

  return (
    <div className="space-y-3">
      {state === 'idle' && <Button onClick={start} disabled={disabled}>Grabar respuesta</Button>}
      {state === 'recording' && <Button variant="ghost" onClick={stop}>■ Detener</Button>}
      {state === 'recorded' && url && (
        <div className="space-y-2">
          <audio controls src={url} />
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => { setState('idle'); setUrl(null) }} disabled={disabled}>Volver a grabar</Button>
            <Button onClick={() => blobRef.current && onSubmit(blobRef.current)} disabled={disabled}>Enviar audio</Button>
          </div>
        </div>
      )}
    </div>
  )
}

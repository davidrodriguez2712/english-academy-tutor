'use client'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { rmsDb, isSilent } from '@/lib/speaking/audio-level'

async function analyzeBlob(blob: Blob): Promise<number> {
  const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  const ctx = new AudioCtx()
  try {
    const buffer = await ctx.decodeAudioData(await blob.arrayBuffer())
    let db = -Infinity
    for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
      db = Math.max(db, rmsDb(buffer.getChannelData(ch)))
    }
    return db
  } finally {
    await ctx.close()
  }
}

export function AudioRecorder({
  onSubmit,
  disabled,
}: {
  onSubmit: (blob: Blob) => void
  disabled?: boolean
}) {
  const [state, setState] = useState<'idle' | 'recording' | 'recorded'>('idle')
  const [url, setUrl] = useState<string | null>(null)
  const [micError, setMicError] = useState<string | null>(null)
  const [level, setLevel] = useState(0)
  const [silenceWarning, setSilenceWarning] = useState(false)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const blobRef = useRef<Blob | null>(null)
  const meterCtxRef = useRef<AudioContext | null>(null)
  const rafRef = useRef<number | null>(null)

  function stopMeter() {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    meterCtxRef.current?.close()
    meterCtxRef.current = null
    setLevel(0)
  }

  useEffect(() => stopMeter, [])

  function startMeter(stream: MediaStream) {
    const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new AudioCtx()
    meterCtxRef.current = ctx
    const source = ctx.createMediaStreamSource(stream)
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 1024
    source.connect(analyser)
    const data = new Float32Array(analyser.fftSize)
    const tick = () => {
      analyser.getFloatTimeDomainData(data)
      const db = rmsDb(data)
      // Mapea -60..0 dB a 0..100 para una barra visual simple.
      const pct = Math.max(0, Math.min(100, ((db + 60) / 60) * 100))
      setLevel(pct)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }

  async function start() {
    setMicError(null)
    setSilenceWarning(false)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const rec = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      chunksRef.current = []
      rec.ondataavailable = (e) => chunksRef.current.push(e.data)
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        stopMeter()
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        blobRef.current = blob
        setUrl(URL.createObjectURL(blob))
        setState('recorded')
        try {
          setSilenceWarning(isSilent(await analyzeBlob(blob)))
        } catch {
          // Si no se puede analizar (formato no soportado por decodeAudioData, etc.)
          // dejamos pasar sin bloquear el envío.
        }
      }
      recorderRef.current = rec
      rec.start()
      startMeter(stream)
      setState('recording')
    } catch {
      setMicError('No se pudo acceder al micrófono. Revisa los permisos del navegador.')
      setState('idle')
    }
  }

  function stop() {
    recorderRef.current?.stop()
  }

  return (
    <div className="space-y-3">
      {micError && <p style={{ color: 'var(--warning)' }}>{micError}</p>}
      {state === 'idle' && <Button onClick={start} disabled={disabled}>Grabar respuesta</Button>}
      {state === 'recording' && (
        <div className="space-y-2">
          <div className="h-2 w-40 overflow-hidden rounded-full" style={{ background: 'var(--border)' }}>
            <div
              className="h-full rounded-full transition-[width]"
              style={{ width: `${level}%`, background: level < 8 ? 'var(--warning)' : 'var(--primary)' }}
            />
          </div>
          {level < 8 && (
            <p className="text-xs" style={{ color: 'var(--warning)' }}>
              No se detecta sonido. Revisa que el micrófono correcto esté seleccionado.
            </p>
          )}
          <Button variant="ghost" onClick={stop}>■ Detener</Button>
        </div>
      )}
      {state === 'recorded' && url && (
        <div className="space-y-2">
          <audio controls src={url} />
          {silenceWarning && (
            <p style={{ color: 'var(--warning)' }}>
              No detectamos voz en esta grabación (el nivel de audio es casi nulo). Revisa el
              micrófono e inténtalo de nuevo antes de enviar.
            </p>
          )}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => { setState('idle'); setUrl(null); setSilenceWarning(false) }} disabled={disabled}>Volver a grabar</Button>
            <Button onClick={() => blobRef.current && onSubmit(blobRef.current)} disabled={disabled}>
              {silenceWarning ? 'Enviar de todas formas' : 'Enviar audio'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

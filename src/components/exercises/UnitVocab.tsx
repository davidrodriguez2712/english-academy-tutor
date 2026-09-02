'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { errorFrom } from '@/lib/http'
import { SpeakButton } from '@/components/vocab/SpeakButton'
import type { UnitVocabContent } from '@/lib/validation/unit-vocab'

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; content: UnitVocabContent }

export function UnitVocab({ unitId }: { unitId: string }) {
  const [state, setState] = useState<State>({ status: 'loading' })
  const [regenerating, setRegenerating] = useState(false)
  const started = useRef(false)

  const load = useCallback(
    async (regenerate = false) => {
      if (regenerate) setRegenerating(true)
      else setState({ status: 'loading' })
      try {
        const res = await fetch(
          `/api/units/${unitId}/vocab${regenerate ? '?regenerate=1' : ''}`,
          { method: 'POST' },
        )
        if (!res.ok) {
          setState({ status: 'error', message: await errorFrom(res) })
          return
        }
        const data = await res.json()
        setState({ status: 'ready', content: data.content })
      } catch {
        setState({ status: 'error', message: 'Error de red, inténtalo de nuevo' })
      } finally {
        setRegenerating(false)
      }
    },
    [unitId],
  )

  useEffect(() => {
    if (started.current) return
    started.current = true
    load()
  }, [load])

  if (state.status === 'loading') return <Spinner label="Generando vocabulario…" />

  if (state.status === 'error') {
    return (
      <div className="space-y-2">
        <p style={{ color: 'var(--warning)' }}>{state.message}</p>
        <Button onClick={() => load()}>Reintentar</Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-sm">
          <thead>
            <tr style={{ color: 'var(--muted)' }}>
              <th className="p-2 text-left">Palabra</th>
              <th className="p-2 text-left">Traducción</th>
              <th className="p-2 text-left">Tipo</th>
              <th className="p-2 text-left">Significado</th>
              <th className="p-2 text-left">IPA</th>
              <th className="p-2 text-left">🔊</th>
              <th className="p-2 text-left">Ejemplos</th>
            </tr>
          </thead>
          <tbody>
            {state.content.items.map((w, i) => (
              <tr
                key={i}
                className="border-t align-top"
                style={{ borderColor: 'var(--border)' }}
              >
                <td className="p-2 font-medium">{w.word}</td>
                <td className="p-2">{w.translation}</td>
                <td className="p-2" style={{ color: 'var(--muted)' }}>
                  {w.partOfSpeech}
                </td>
                <td className="p-2">{w.meaning}</td>
                <td className="p-2">{w.ipa}</td>
                <td className="p-2">
                  <SpeakButton text={w.word} />
                </td>
                <td className="p-2">
                  <ul className="list-disc pl-4">
                    {w.examples.map((ex, j) => (
                      <li key={j}>{ex}</li>
                    ))}
                  </ul>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-2">
        <button
          className="text-xs"
          style={{ color: 'var(--muted)' }}
          disabled={regenerating}
          onClick={() => load(true)}
        >
          Regenerar vocabulario
        </button>
        {regenerating && <Spinner label="Generando…" />}
      </div>
    </div>
  )
}

'use client'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { errorFrom } from '@/lib/http'
import { Tabs } from '@/components/ui/Tabs'
import { Card } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { Button } from '@/components/ui/Button'
import { EXERCISE_TABS } from '@/lib/exercise-types'
import type { ExerciseType } from '@prisma/client'
import type {
  MultipleChoiceContent,
  FillBlanksContent,
  MatchingContent,
  OrderWordsContent,
  FlashcardsContent,
} from '@/lib/validation/exercises'
import { MultipleChoice } from './MultipleChoice'
import { FillBlanks } from './FillBlanks'
import { Matching } from './Matching'
import { OrderWords } from './OrderWords'
import { Flashcards } from './Flashcards'

type ExerciseContent =
  | MultipleChoiceContent
  | FillBlanksContent
  | MatchingContent
  | OrderWordsContent
  | FlashcardsContent

export function ExerciseRunner({ unitId }: { unitId: string }) {
  const router = useRouter()
  const [active, setActive] = useState<ExerciseType>('MULTIPLE_CHOICE')
  const [state, setState] = useState<
    | { status: 'idle' | 'loading' | 'error'; message?: string }
    | { status: 'ready'; setId: string; content: ExerciseContent }
  >({ status: 'idle' })
  const [result, setResult] = useState<{ score: number; xpEarned: number; totalCount: number } | null>(null)
  const [finishError, setFinishError] = useState<string | null>(null)
  const lastSubmit = useRef<
    { setId: string; r: { correctCount: number; totalCount: number; answers: unknown } } | null
  >(null)
  // true en cuanto un intento se guarda con éxito: evita dobles POST desde
  // componentes que quedan montados sin estado `done` (p.ej. Flashcards).
  const submittedRef = useRef(false)

  async function load(type: ExerciseType, regenerate = false) {
    setActive(type)
    setResult(null)
    setFinishError(null)
    lastSubmit.current = null
    submittedRef.current = false
    setState({ status: 'loading' })
    const res = await fetch(`/api/units/${unitId}/exercises?type=${type}${regenerate ? '&regenerate=1' : ''}`, {
      method: 'POST',
    })
    if (!res.ok) {
      setState({ status: 'error', message: await errorFrom(res) })
      return
    }
    const data = await res.json()
    setState({ status: 'ready', setId: data.id, content: data.content })
  }

  async function finish(setId: string, r: { correctCount: number; totalCount: number; answers: unknown }) {
    if (submittedRef.current) return // ya se guardó este set; ignora clics extra
    lastSubmit.current = { setId, r }
    setFinishError(null)
    const res = await fetch('/api/attempts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exerciseSetId: setId, ...r }),
    })
    if (!res.ok) {
      setFinishError(await errorFrom(res))
      return
    }
    const data = await res.json()
    submittedRef.current = true
    setResult({ ...data, totalCount: r.totalCount })
    router.refresh() // actualiza la cabecera de XP/racha
  }

  return (
    <div className="space-y-4">
      <Tabs
        tabs={EXERCISE_TABS.map((t) => ({ id: t.type, label: t.label }))}
        active={active}
        onChange={(id) => load(id as ExerciseType)}
      />
      <Card>
        {state.status === 'idle' && <p style={{ color: 'var(--muted)' }}>Elige una pestaña para empezar.</p>}
        {state.status === 'loading' && <Spinner label="Generando ejercicio…" />}
        {state.status === 'error' && (
          <div className="space-y-2">
            <p style={{ color: 'var(--warning)' }}>{state.message}</p>
            <Button onClick={() => load(active)}>Reintentar</Button>
          </div>
        )}
        {state.status === 'ready' && (
          <div className="space-y-4">
            {result && (
              <div className="space-y-2 rounded-lg border p-3" style={{ borderColor: 'var(--border)' }}>
                <p className="font-medium">
                  {result.totalCount === 0
                    ? `Sesión completada · +${result.xpEarned} XP`
                    : `Puntuación: ${result.score}% · +${result.xpEarned} XP`}
                </p>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => load(active, true)}>Regenerar</Button>
                  <Button onClick={() => load(active)}>Repetir</Button>
                </div>
              </div>
            )}

            {active === 'MULTIPLE_CHOICE' && (
              <MultipleChoice content={state.content as MultipleChoiceContent} onFinish={(r) => finish(state.setId, r)} />
            )}
            {active === 'FILL_BLANKS' && (
              <FillBlanks content={state.content as FillBlanksContent} onFinish={(r) => finish(state.setId, r)} />
            )}
            {active === 'MATCHING' && (
              <Matching content={state.content as MatchingContent} onFinish={(r) => finish(state.setId, r)} />
            )}
            {active === 'ORDER_WORDS' && (
              <OrderWords content={state.content as OrderWordsContent} onFinish={(r) => finish(state.setId, r)} />
            )}
            {active === 'FLASHCARDS' && (
              <Flashcards content={state.content as FlashcardsContent} onFinish={(r) => finish(state.setId, r)} />
            )}

            {finishError && (
              <div className="space-y-2">
                <p style={{ color: 'var(--warning)' }}>
                  No se pudo guardar el intento: {finishError}
                </p>
                <Button
                  onClick={() =>
                    lastSubmit.current && finish(lastSubmit.current.setId, lastSubmit.current.r)
                  }
                >
                  Reintentar guardado
                </Button>
              </div>
            )}

            {!result && (
              <button className="text-xs" style={{ color: 'var(--muted)' }} onClick={() => load(active, true)}>
                Regenerar este ejercicio
              </button>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}

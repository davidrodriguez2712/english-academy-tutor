'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { gradeFillBlanks } from '@/lib/exercises/grade'
import { isFillBlankCorrect } from '@/lib/exercises/normalize'
import type { FillBlanksContent } from '@/lib/validation/exercises'

export function FillBlanks({ content, onFinish }: {
  content: FillBlanksContent
  onFinish: (r: { correctCount: number; totalCount: number; answers: unknown }) => void
}) {
  const [answers, setAnswers] = useState<string[]>(content.items.map(() => ''))
  const [done, setDone] = useState(false)

  function submit() {
    setDone(true)
    const g = gradeFillBlanks(answers, content.items)
    onFinish({ correctCount: g.correctCount, totalCount: g.totalCount, answers })
  }

  return (
    <div className="space-y-4">
      {content.items.map((it, i) => {
        const ok = done && isFillBlankCorrect(answers[i], it.answer, it.acceptedVariants)
        const [before, after] = it.sentence.split('___')
        return (
          <div key={i} className="text-sm">
            {before}
            <input
              disabled={done}
              value={answers[i]}
              onChange={(e) => setAnswers((a) => a.map((v, k) => (k === i ? e.target.value : v)))}
              className="mx-1 rounded border px-2 py-1"
              style={{ borderColor: done ? (ok ? 'var(--success)' : 'var(--warning)') : 'var(--border)', background: 'var(--bg)' }}
            />
            {after}
            {done && !ok && <span className="ml-2" style={{ color: 'var(--muted)' }}>→ {it.answer}</span>}
          </div>
        )
      })}
      {!done && <Button onClick={submit}>Comprobar</Button>}
    </div>
  )
}

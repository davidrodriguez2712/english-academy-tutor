'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { gradeMultipleChoice } from '@/lib/exercises/grade'
import type { MultipleChoiceContent } from '@/lib/validation/exercises'

export function MultipleChoice({
  content,
  onFinish,
}: {
  content: MultipleChoiceContent
  onFinish: (r: { correctCount: number; totalCount: number; answers: unknown }) => void
}) {
  const [answers, setAnswers] = useState<(number | null)[]>(content.items.map(() => null))
  const [done, setDone] = useState(false)

  function submit() {
    setDone(true)
    const g = gradeMultipleChoice(answers, content.items)
    onFinish({ correctCount: g.correctCount, totalCount: g.totalCount, answers })
  }

  return (
    <div className="space-y-5">
      {content.items.map((q, i) => (
        <div key={i}>
          <p className="font-medium">{i + 1}. {q.question}</p>
          <div className="mt-2 space-y-1">
            {q.options.map((opt, j) => {
              const chosen = answers[i] === j
              const showRight = done && j === q.correctIndex
              const showWrong = done && chosen && j !== q.correctIndex
              return (
                <label
                  key={j}
                  className="block cursor-pointer rounded-lg border px-3 py-2 text-sm"
                  style={{
                    borderColor: showRight ? 'var(--success)' : showWrong ? 'var(--warning)' : 'var(--border)',
                    background: chosen ? 'var(--bg)' : 'transparent',
                  }}
                >
                  <input
                    type="radio"
                    name={`q${i}`}
                    className="mr-2"
                    disabled={done}
                    checked={chosen}
                    onChange={() => setAnswers((a) => a.map((v, k) => (k === i ? j : v)))}
                  />
                  {opt}
                </label>
              )
            })}
          </div>
          {done && <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>{q.explanation}</p>}
        </div>
      ))}
      {!done && <Button onClick={submit}>Comprobar</Button>}
    </div>
  )
}

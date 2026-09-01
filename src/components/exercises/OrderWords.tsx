'use client'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { gradeOrderWords } from '@/lib/exercises/grade'
import type { OrderWordsContent } from '@/lib/validation/exercises'

export function OrderWords({ content, onFinish }: {
  content: OrderWordsContent
  onFinish: (r: { correctCount: number; totalCount: number; answers: unknown }) => void
}) {
  const initial = useMemo(() => content.items.map((it) => [...it.scrambled]), [content])
  const [arrangements, setArrangements] = useState<string[][]>(initial)
  const [done, setDone] = useState(false)

  function move(itemIdx: number, from: number, to: number) {
    setArrangements((prev) =>
      prev.map((row, k) => {
        if (k !== itemIdx || to < 0 || to >= row.length) return row
        const copy = [...row]
        ;[copy[from], copy[to]] = [copy[to], copy[from]]
        return copy
      }),
    )
  }

  function submit() {
    setDone(true)
    const g = gradeOrderWords(arrangements, content.items)
    onFinish({ correctCount: g.correctCount, totalCount: g.totalCount, answers: arrangements })
  }

  return (
    <div className="space-y-4">
      {arrangements.map((row, i) => {
        const ok = done && row.join(' ') === content.items[i].correctOrder.join(' ')
        return (
          <div key={i} className="flex flex-wrap items-center gap-1 text-sm">
            {row.map((w, j) => (
              <span key={j} className="inline-flex items-center gap-1 rounded border px-2 py-1" style={{ borderColor: 'var(--border)' }}>
                {!done && <button onClick={() => move(i, j, j - 1)}>◀</button>}
                {w}
                {!done && <button onClick={() => move(i, j, j + 1)}>▶</button>}
              </span>
            ))}
            {done && <span className="ml-2">{ok ? '✅' : `→ ${content.items[i].correctOrder.join(' ')}`}</span>}
          </div>
        )
      })}
      {!done && <Button onClick={submit}>Comprobar</Button>}
    </div>
  )
}

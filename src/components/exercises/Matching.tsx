'use client'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { gradeMatching } from '@/lib/exercises/grade'
import { shuffle } from '@/lib/exercises/shuffle'
import type { MatchingContent } from '@/lib/validation/exercises'

export function Matching({ content, onFinish }: {
  content: MatchingContent
  onFinish: (r: { correctCount: number; totalCount: number; answers: unknown }) => void
}) {
  // rightOrder[k] = índice original del par mostrado en la posición k del desplegable
  const rightOrder = useMemo(() => shuffle(content.items.map((_, i) => i), 1234), [content])
  const [picks, setPicks] = useState<Record<number, number>>({})
  const [done, setDone] = useState(false)

  function submit() {
    setDone(true)
    const g = gradeMatching(picks, content.items.length)
    onFinish({ correctCount: g.correctCount, totalCount: g.totalCount, answers: picks })
  }

  return (
    <div className="space-y-3">
      {content.items.map((it, i) => (
        <div key={i} className="flex items-center gap-3 text-sm">
          <span className="w-40 font-medium">{it.left}</span>
          <select
            disabled={done}
            value={picks[i] ?? ''}
            onChange={(e) => setPicks((p) => ({ ...p, [i]: Number(e.target.value) }))}
            className="rounded border px-2 py-1"
            style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}
          >
            <option value="">—</option>
            {rightOrder.map((origIdx) => (
              <option key={origIdx} value={origIdx}>{content.items[origIdx].right}</option>
            ))}
          </select>
          {done && (picks[i] === i ? '✅' : `❌ ${it.right}`)}
        </div>
      ))}
      {!done && <Button onClick={submit}>Comprobar</Button>}
    </div>
  )
}

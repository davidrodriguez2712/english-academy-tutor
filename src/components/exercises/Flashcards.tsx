'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import type { FlashcardsContent } from '@/lib/validation/exercises'

export function Flashcards({ content, onFinish }: {
  content: FlashcardsContent
  onFinish: (r: { correctCount: number; totalCount: number; answers: unknown }) => void
}) {
  const [i, setI] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [known, setKnown] = useState<boolean[]>([])
  const card = content.items[i]
  const last = i === content.items.length - 1

  function mark(k: boolean) {
    const next = [...known, k]
    setKnown(next)
    if (last) {
      onFinish({ correctCount: 0, totalCount: 0, answers: next })
    } else {
      setI(i + 1)
      setFlipped(false)
    }
  }

  return (
    <div className="space-y-4">
      <div
        onClick={() => setFlipped((f) => !f)}
        className="flex h-40 cursor-pointer items-center justify-center rounded-2xl border text-lg"
        style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
      >
        {flipped ? card.back : card.front}
      </div>
      <div className="text-sm" style={{ color: 'var(--muted)' }}>Tarjeta {i + 1} / {content.items.length}</div>
      <div className="flex gap-2">
        <Button variant="ghost" onClick={() => mark(false)}>No la sabía</Button>
        <Button onClick={() => mark(true)}>La sabía</Button>
      </div>
    </div>
  )
}

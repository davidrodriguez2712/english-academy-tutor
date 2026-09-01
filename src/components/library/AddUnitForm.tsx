'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { errorFrom } from '@/lib/http'

export function AddUnitForm({ bookId }: { bookId: string }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const f = new FormData(e.currentTarget)
    const res = await fetch('/api/units', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookId,
        title: f.get('title'),
        startPage: Number(f.get('startPage')),
        endPage: Number(f.get('endPage')),
        level: f.get('level') || undefined,
      }),
    })
    setBusy(false)
    if (!res.ok) return setError(await errorFrom(res))
    ;(e.target as HTMLFormElement).reset()
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
      <label className="text-sm">Título<br /><input name="title" required className="rounded border px-2 py-1" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }} /></label>
      <label className="text-sm">Pág. inicio<br /><input name="startPage" type="number" min={1} required className="w-24 rounded border px-2 py-1" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }} /></label>
      <label className="text-sm">Pág. fin<br /><input name="endPage" type="number" min={1} required className="w-24 rounded border px-2 py-1" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }} /></label>
      <label className="text-sm">Nivel (opcional)<br /><input name="level" placeholder="A2–B1" className="w-24 rounded border px-2 py-1" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }} /></label>
      <Button disabled={busy}>{busy ? 'Guardando…' : 'Añadir unidad'}</Button>
      {error && <span style={{ color: 'var(--warning)' }}>{error}</span>}
    </form>
  )
}

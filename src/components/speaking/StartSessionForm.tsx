'use client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { errorFrom } from '@/lib/http'

export function StartSessionForm({ units }: { units: { id: string; title: string }[] }) {
  const router = useRouter()
  const preUnit = useSearchParams().get('unitId') ?? ''
  const [mode, setMode] = useState<'GUIDED' | 'MONOLOGUE'>('GUIDED')
  const [unitId, setUnitId] = useState(preUnit)
  const [topic, setTopic] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function start() {
    setBusy(true)
    setError(null)
    const res = await fetch('/api/speaking/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode,
        unitId: mode === 'GUIDED' && unitId ? unitId : undefined,
        topic: topic || undefined,
      }),
    })
    setBusy(false)
    if (!res.ok) return setError(await errorFrom(res))
    router.push(`/speaking/${(await res.json()).id}`)
  }

  return (
    <Card>
      <div className="space-y-4">
        <div className="flex gap-2">
          <Button variant={mode === 'GUIDED' ? 'primary' : 'ghost'} onClick={() => setMode('GUIDED')}>Conversación guiada</Button>
          <Button variant={mode === 'MONOLOGUE' ? 'primary' : 'ghost'} onClick={() => setMode('MONOLOGUE')}>Monólogo libre</Button>
        </div>

        {mode === 'GUIDED' && (
          <label className="block text-sm">
            Unidad (opcional)<br />
            <select value={unitId} onChange={(e) => setUnitId(e.target.value)} className="rounded border px-2 py-1" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
              <option value="">— Tema libre —</option>
              {units.map((u) => <option key={u.id} value={u.id}>{u.title}</option>)}
            </select>
          </label>
        )}

        {(mode === 'MONOLOGUE' || !unitId) && (
          <label className="block text-sm">
            Tema {mode === 'MONOLOGUE' ? '(obligatorio)' : '(si no eliges unidad)'}<br />
            <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="My last trip" className="w-72 rounded border px-2 py-1" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }} />
          </label>
        )}

        <p className="text-xs" style={{ color: 'var(--muted)' }}>
          {mode === 'GUIDED' ? '5 turnos. La IA responde y sigue la conversación.' : '1 turno. La IA solo corrige lo que digas.'}
        </p>

        <Button onClick={start} disabled={busy}>{busy ? 'Iniciando…' : 'Empezar'}</Button>
        {error && <p style={{ color: 'var(--warning)' }}>{error}</p>}
      </div>
    </Card>
  )
}

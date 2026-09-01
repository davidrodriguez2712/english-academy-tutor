'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { errorFrom } from '@/lib/http'

export function UploadBookForm() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    const data = new FormData(e.currentTarget)
    const res = await fetch('/api/books', { method: 'POST', body: data })
    setBusy(false)
    if (!res.ok) {
      setError(await errorFrom(res))
      return
    }
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="flex items-center gap-3">
      <input type="file" name="file" accept="application/pdf" required />
      <Button disabled={busy}>{busy ? 'Procesando…' : 'Subir PDF'}</Button>
      {error && <span style={{ color: 'var(--warning)' }}>{error}</span>}
    </form>
  )
}

'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { errorFrom } from '@/lib/http'

// Debe coincidir con MAX_PDF_MB del servidor (por defecto 50). Solo es un aviso
// temprano en el cliente; el servidor es el que manda.
const MAX_MB = 50

export function UploadBookForm() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [picked, setPicked] = useState<{ name: string; mb: string } | null>(null)

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null)
    const f = e.target.files?.[0]
    if (!f) return setPicked(null)
    const mb = f.size / 1024 / 1024
    setPicked({ name: f.name, mb: mb.toFixed(1) })
    if (mb > MAX_MB) {
      setError(`Ese PDF pesa ${mb.toFixed(1)} MB (límite ${MAX_MB} MB). Comprímelo o sube solo los capítulos que necesites.`)
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const input = e.currentTarget.elements.namedItem('file') as HTMLInputElement
    const f = input.files?.[0]
    if (!f) return setError('Elige un archivo PDF primero.')
    if (f.size / 1024 / 1024 > MAX_MB) {
      return setError(`Ese PDF supera el límite de ${MAX_MB} MB.`)
    }

    setBusy(true)
    try {
      const data = new FormData()
      data.append('file', f)
      const res = await fetch('/api/books', { method: 'POST', body: data })
      if (!res.ok) {
        setError(await errorFrom(res))
        return
      }
      setPicked(null)
      input.value = ''
      router.refresh()
    } catch {
      setError('La subida falló (archivo demasiado grande o conexión interrumpida). Prueba con un PDF más pequeño.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-center gap-3">
      <input type="file" name="file" accept="application/pdf" required onChange={onPick} />
      <Button disabled={busy}>{busy ? 'Procesando…' : 'Subir PDF'}</Button>
      {picked && !error && (
        <span className="text-sm" style={{ color: 'var(--muted)' }}>
          {picked.name} · {picked.mb} MB
        </span>
      )}
      {error && <span style={{ color: 'var(--warning)' }}>{error}</span>}
    </form>
  )
}

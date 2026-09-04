'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { errorFrom } from '@/lib/http'
import { SpeakButton } from './SpeakButton'
import type { VocabEntryDTO } from '@/lib/vocab/entry'

const inputStyle = { borderColor: 'var(--border)', background: 'var(--bg)' }

export function VocabTable({ initial }: { initial: VocabEntryDTO[] }) {
  const [entries, setEntries] = useState<VocabEntryDTO[]>(initial)
  const [word, setWord] = useState('')
  const [category, setCategory] = useState('')
  const [adding, setAdding] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [rowBusy, setRowBusy] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [knownCategories, setKnownCategories] = useState<string[]>(
    Array.from(new Set(initial.map((e) => e.category).filter((c): c is string => !!c))).sort(),
  )
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  const rememberCategory = useCallback((c: string | null | undefined) => {
    if (!c) return
    setKnownCategories((prev) => (prev.includes(c) ? prev : [...prev, c].sort()))
  }, [])

  const refresh = useCallback(async (nextQ: string, nextCategory: string) => {
    const params = new URLSearchParams()
    if (nextQ.trim()) params.set('q', nextQ.trim())
    if (nextCategory) params.set('category', nextCategory)
    const res = await fetch(`/api/vocab?${params.toString()}`)
    if (res.ok) setEntries((await res.json()).entries)
  }, [])

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current)
    debounce.current = setTimeout(() => refresh(q, categoryFilter), 300)
    return () => {
      if (debounce.current) clearTimeout(debounce.current)
    }
  }, [q, categoryFilter, refresh])

  async function add(e: React.FormEvent) {
    e.preventDefault()
    if (!word.trim() || adding) return
    setAdding(true)
    setMessage(null)
    try {
      const res = await fetch('/api/vocab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word, category: category.trim() || undefined }),
      })
      if (res.ok) {
        rememberCategory(category.trim() || null)
        setWord('')
        setCategory('')
        await refresh(q, categoryFilter)
      } else {
        setMessage(await errorFrom(res))
      }
    } catch {
      setMessage('Error de red, inténtalo de nuevo')
    } finally {
      setAdding(false)
    }
  }

  async function act(id: string, run: () => Promise<Response>) {
    setRowBusy(id)
    setMessage(null)
    try {
      const res = await run()
      if (res.ok) {
        setConfirmDelete(null)
        await refresh(q, categoryFilter)
      } else {
        setMessage(await errorFrom(res))
      }
    } catch {
      setMessage('Error de red, inténtalo de nuevo')
    } finally {
      setRowBusy(null)
    }
  }

  async function updateCategory(id: string, nextCategory: string) {
    rememberCategory(nextCategory.trim() || null)
    await act(id, () =>
      fetch(`/api/vocab/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: nextCategory.trim() }),
      }),
    )
  }

  const categoryListId = useMemo(() => 'vocab-categories', [])

  return (
    <div className="space-y-4">
      <datalist id={categoryListId}>
        {knownCategories.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>

      <Card>
        <form onSubmit={add} className="flex flex-wrap items-center gap-2">
          <input
            value={word}
            onChange={(e) => setWord(e.target.value)}
            maxLength={100}
            placeholder="Palabra o expresión en inglés"
            className="flex-1 rounded-lg border px-3 py-2 text-sm"
            style={inputStyle}
          />
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            list={categoryListId}
            maxLength={50}
            placeholder="Categoría (opcional): Unidad 1…"
            className="w-48 rounded-lg border px-3 py-2 text-sm"
            style={inputStyle}
          />
          <Button type="submit" disabled={adding || !word.trim()}>
            Añadir
          </Button>
          {adding && <Spinner label="Generando ficha…" />}
        </form>
        {message && (
          <p className="mt-2 text-sm" style={{ color: 'var(--warning)' }}>
            {message}
          </p>
        )}
      </Card>

      <div className="flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por palabra o traducción…"
          className="rounded-lg border px-3 py-2 text-sm"
          style={inputStyle}
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm"
          style={inputStyle}
        >
          <option value="">Todas las categorías</option>
          {knownCategories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-sm">
          <thead>
            <tr style={{ color: 'var(--muted)' }}>
              <th className="p-2 text-left">Palabra</th>
              <th className="p-2 text-left">Traducción</th>
              <th className="p-2 text-left">Tipo</th>
              <th className="p-2 text-left">Significado</th>
              <th className="p-2 text-left">IPA</th>
              <th className="p-2 text-left">🔊</th>
              <th className="p-2 text-left">Ejemplos</th>
              <th className="p-2 text-left">Categoría</th>
              <th className="p-2 text-left">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr
                key={entry.id}
                className="border-t align-top"
                style={{ borderColor: 'var(--border)' }}
              >
                <td className="p-2 font-medium">{entry.displayWord}</td>
                <td className="p-2">{entry.translation}</td>
                <td className="p-2" style={{ color: 'var(--muted)' }}>
                  {entry.partOfSpeech}
                </td>
                <td className="p-2">{entry.meaning}</td>
                <td className="p-2">{entry.ipa}</td>
                <td className="p-2">
                  <SpeakButton text={entry.displayWord} />
                </td>
                <td className="p-2">
                  <ul className="list-disc pl-4">
                    {entry.examples.map((ex, i) => (
                      <li key={i}>{ex}</li>
                    ))}
                  </ul>
                </td>
                <td className="p-2">
                  <input
                    key={`${entry.id}-${entry.category ?? ''}`}
                    defaultValue={entry.category ?? ''}
                    list={categoryListId}
                    disabled={rowBusy === entry.id}
                    placeholder="Sin categoría"
                    className="w-32 rounded-lg border px-2 py-1 text-xs"
                    style={inputStyle}
                    onBlur={(e) => {
                      const next = e.target.value
                      if (next.trim() !== (entry.category ?? '')) updateCategory(entry.id, next)
                    }}
                  />
                </td>
                <td className="p-2">
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      disabled={rowBusy === entry.id}
                      onClick={() =>
                        act(entry.id, () =>
                          fetch(`/api/vocab/${entry.id}/regenerate`, { method: 'POST' }),
                        )
                      }
                    >
                      Regenerar
                    </Button>
                    {confirmDelete === entry.id ? (
                      <>
                        <Button
                          variant="ghost"
                          disabled={rowBusy === entry.id}
                          onClick={() =>
                            act(entry.id, () =>
                              fetch(`/api/vocab/${entry.id}`, { method: 'DELETE' }),
                            )
                          }
                        >
                          ¿Seguro?
                        </Button>
                        <Button variant="ghost" onClick={() => setConfirmDelete(null)}>
                          Cancelar
                        </Button>
                      </>
                    ) : (
                      <Button variant="ghost" onClick={() => setConfirmDelete(entry.id)}>
                        Borrar
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={9} className="p-4" style={{ color: 'var(--muted)' }}>
                  Sin palabras todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

import { describe, it, expect, vi } from 'vitest'
import { withRetry, AiError } from './retry'

describe('withRetry', () => {
  it('devuelve el valor si fn tiene éxito a la primera', async () => {
    const fn = vi.fn().mockResolvedValue(42)
    expect(await withRetry(fn, 'x')).toBe(42)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('reintenta una vez y devuelve el segundo resultado', async () => {
    const fn = vi.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValue('ok')
    expect(await withRetry(fn, 'x')).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('tras dos fallos lanza AiError con el label', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('boom'))
    await expect(withRetry(fn, 'transcribe')).rejects.toBeInstanceOf(AiError)
    await expect(withRetry(fn, 'transcribe')).rejects.toMatchObject({ label: 'transcribe' })
  })
})

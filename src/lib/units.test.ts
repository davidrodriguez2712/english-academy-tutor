import { describe, it, expect } from 'vitest'
import { validateUnitInput } from './units'

describe('validateUnitInput', () => {
  const book = { pageCount: 10 }
  it('acepta un rango válido', () => {
    expect(validateUnitInput({ title: 'U1', startPage: 1, endPage: 4 }, book).ok).toBe(true)
  })
  it('rechaza título vacío', () => {
    expect(validateUnitInput({ title: '  ', startPage: 1, endPage: 2 }, book).ok).toBe(false)
  })
  it('rechaza endPage > pageCount', () => {
    expect(validateUnitInput({ title: 'U', startPage: 1, endPage: 11 }, book).ok).toBe(false)
  })
  it('rechaza startPage < 1', () => {
    expect(validateUnitInput({ title: 'U', startPage: 0, endPage: 2 }, book).ok).toBe(false)
  })
})

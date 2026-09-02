import { describe, it, expect } from 'vitest'
import { shuffle } from './shuffle'

describe('shuffle', () => {
  it('conserva todos los elementos', () => {
    const out = shuffle([1, 2, 3, 4, 5], 42)
    expect([...out].sort()).toEqual([1, 2, 3, 4, 5])
  })
  it('es determinista con la misma semilla', () => {
    expect(shuffle([1, 2, 3, 4, 5], 7)).toEqual(shuffle([1, 2, 3, 4, 5], 7))
  })
  it('no muta el array original', () => {
    const src = [1, 2, 3]
    shuffle(src, 1)
    expect(src).toEqual([1, 2, 3])
  })
})

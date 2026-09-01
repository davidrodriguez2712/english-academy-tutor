import { describe, it, expect } from 'vitest'
import { greet } from './sanity'

describe('greet', () => {
  it('devuelve un saludo', () => {
    expect(greet('Ada')).toBe('Hola, Ada')
  })
})

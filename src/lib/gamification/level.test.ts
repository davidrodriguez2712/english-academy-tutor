import { describe, it, expect } from 'vitest'
import { cumXpForLevel, levelFromXp } from './level'

describe('cumXpForLevel', () => {
  it('sigue la curva 100*(L-1)*L/2', () => {
    expect(cumXpForLevel(1)).toBe(0)
    expect(cumXpForLevel(2)).toBe(100)
    expect(cumXpForLevel(3)).toBe(300)
    expect(cumXpForLevel(4)).toBe(600)
    expect(cumXpForLevel(5)).toBe(1000)
  })
})

describe('levelFromXp', () => {
  it('0 XP => nivel 1', () => {
    expect(levelFromXp(0)).toEqual({ level: 1, xpIntoLevel: 0, xpForNextLevel: 100 })
  })
  it('justo en el umbral sube de nivel', () => {
    expect(levelFromXp(100).level).toBe(2)
    expect(levelFromXp(300).level).toBe(3)
  })
  it('a mitad de tramo', () => {
    const r = levelFromXp(150)
    expect(r.level).toBe(2)
    expect(r.xpIntoLevel).toBe(50)
    expect(r.xpForNextLevel).toBe(200) // cumXp(3)-cumXp(2) = 300-100
  })
  it('XP muy alto no rompe', () => {
    expect(levelFromXp(1_000_000).level).toBeGreaterThan(10)
  })
  it('XP negativo se trata como 0', () => {
    expect(levelFromXp(-5).level).toBe(1)
  })
})

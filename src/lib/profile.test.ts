import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { prisma } from './db'
import { getProfile, recordActivity } from './profile'

beforeEach(async () => {
  await prisma.profile.deleteMany()
})
afterAll(async () => {
  await prisma.profile.deleteMany()
  await prisma.$disconnect()
})

describe('getProfile', () => {
  it('crea la fila si no existe y la reutiliza', async () => {
    const a = await getProfile()
    const b = await getProfile()
    expect(a.id).toBe(b.id)
    expect(a.xp).toBe(0)
  })
})

describe('recordActivity', () => {
  it('primera actividad => racha 1', async () => {
    const p = await recordActivity({ xp: 10, now: new Date('2026-09-01T10:00') })
    expect(p.xp).toBe(10)
    expect(p.currentStreak).toBe(1)
    expect(p.longestStreak).toBe(1)
  })
  it('actividad el día siguiente => racha +1', async () => {
    await recordActivity({ xp: 10, now: new Date('2026-09-01T10:00') })
    const p = await recordActivity({ xp: 5, now: new Date('2026-09-02T10:00') })
    expect(p.xp).toBe(15)
    expect(p.currentStreak).toBe(2)
  })
  it('misma fecha dos veces => racha sin cambio', async () => {
    await recordActivity({ xp: 10, now: new Date('2026-09-01T08:00') })
    const p = await recordActivity({ xp: 10, now: new Date('2026-09-01T20:00') })
    expect(p.currentStreak).toBe(1)
  })
  it('hueco de 2+ días => racha se reinicia a 1, longest se conserva', async () => {
    await recordActivity({ xp: 10, now: new Date('2026-09-01T10:00') })
    await recordActivity({ xp: 10, now: new Date('2026-09-02T10:00') })
    const p = await recordActivity({ xp: 10, now: new Date('2026-09-05T10:00') })
    expect(p.currentStreak).toBe(1)
    expect(p.longestStreak).toBe(2)
  })
})

import { describe, it, expect } from 'vitest'
import { dayDiff } from './dates'

describe('dayDiff', () => {
  it('mismo día => 0 aunque cambie la hora', () => {
    expect(dayDiff(new Date('2026-09-01T23:00'), new Date('2026-09-01T01:00'))).toBe(0)
  })
  it('días consecutivos => 1', () => {
    expect(dayDiff(new Date('2026-09-01T10:00'), new Date('2026-09-02T09:00'))).toBe(1)
  })
  it('hueco de 3 días', () => {
    expect(dayDiff(new Date('2026-09-01T10:00'), new Date('2026-09-04T09:00'))).toBe(3)
  })
})

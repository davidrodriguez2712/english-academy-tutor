import { describe, it, expect } from 'vitest'
import { rmsDb, isSilent, SILENCE_THRESHOLD_DB } from './audio-level'

describe('rmsDb', () => {
  it('silencio absoluto da -Infinity', () => {
    expect(rmsDb(new Float32Array(1000))).toBe(-Infinity)
  })

  it('array vacío da -Infinity', () => {
    expect(rmsDb(new Float32Array(0))).toBe(-Infinity)
  })

  it('amplitud máxima constante da 0 dB', () => {
    expect(rmsDb(new Float32Array(1000).fill(1))).toBeCloseTo(0, 5)
  })

  it('una señal de amplitud 0.1 da ~-20 dB', () => {
    expect(rmsDb(new Float32Array(1000).fill(0.1))).toBeCloseTo(-20, 5)
  })
})

describe('isSilent', () => {
  it('marca como silencio audio muy por debajo del umbral', () => {
    expect(isSilent(-79.9)).toBe(true)
  })

  it('no marca como silencio voz normal', () => {
    expect(isSilent(-20)).toBe(false)
  })

  it('el umbral exacto no cuenta como silencio', () => {
    expect(isSilent(SILENCE_THRESHOLD_DB)).toBe(false)
  })
})

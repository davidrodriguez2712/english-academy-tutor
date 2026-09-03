/** dB relativo a amplitud 1.0 del RMS de una señal PCM. -Infinity si está en silencio absoluto. */
export function rmsDb(samples: Float32Array): number {
  if (samples.length === 0) return -Infinity
  let sumSquares = 0
  for (let i = 0; i < samples.length; i++) sumSquares += samples[i] * samples[i]
  const rms = Math.sqrt(sumSquares / samples.length)
  return rms === 0 ? -Infinity : 20 * Math.log10(rms)
}

// Voz normal ronda entre -30 dB y -10 dB de RMS. Por debajo de esto no hay
// señal útil que transcribir (silencio, mic equivocado, mic muteado, etc.).
export const SILENCE_THRESHOLD_DB = -45

export function isSilent(db: number): boolean {
  return db < SILENCE_THRESHOLD_DB
}

export function shuffle<T>(arr: T[], seed?: number): T[] {
  const out = [...arr]
  let s = seed ?? Math.floor(Math.random() * 2 ** 31)
  const rand = () => {
    s = (s * 1664525 + 1013904223) % 2 ** 32
    return s / 2 ** 32
  }
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

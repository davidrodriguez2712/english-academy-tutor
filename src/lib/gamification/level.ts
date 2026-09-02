export function cumXpForLevel(level: number): number {
  return (100 * (level - 1) * level) / 2
}

export function levelFromXp(xp: number): {
  level: number
  xpIntoLevel: number
  xpForNextLevel: number
} {
  const safeXp = Math.max(0, Math.floor(xp))
  let level = 1
  while (cumXpForLevel(level + 1) <= safeXp) level++
  const base = cumXpForLevel(level)
  return {
    level,
    xpIntoLevel: safeXp - base,
    xpForNextLevel: cumXpForLevel(level + 1) - base,
  }
}

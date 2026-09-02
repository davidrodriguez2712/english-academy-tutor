import { getProfile } from '@/lib/profile'
import { levelFromXp } from '@/lib/gamification/level'
import { ProgressBar } from './ui/ProgressBar'

export async function StatsHeader() {
  const profile = await getProfile()
  const { level, xpIntoLevel, xpForNextLevel } = levelFromXp(profile.xp)
  return (
    <header
      className="flex items-center gap-6 border-b px-6 py-3 text-sm"
      style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
    >
      <span>🔥 {profile.currentStreak} días</span>
      <span>⭐ {profile.xp} XP</span>
      <div className="flex items-center gap-2">
        <span>Nivel {level}</span>
        <div className="w-40">
          <ProgressBar value={xpIntoLevel} max={xpForNextLevel} />
        </div>
      </div>
    </header>
  )
}

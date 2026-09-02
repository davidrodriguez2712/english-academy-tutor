import Link from 'next/link'
import { prisma } from '@/lib/db'
import { getProfile } from '@/lib/profile'
import { levelFromXp } from '@/lib/gamification/level'
import { Card } from '@/components/ui/Card'
import { ProgressRing } from '@/components/ui/ProgressRing'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const profile = await getProfile()
  const lvl = levelFromXp(profile.xp)
  const [lastUnit, attemptCount, sessionCount] = await Promise.all([
    prisma.unit.findFirst({ where: { lastOpenedAt: { not: null } }, orderBy: { lastOpenedAt: 'desc' } }),
    prisma.exerciseAttempt.count(),
    prisma.speakingSession.count({ where: { status: 'COMPLETED' } }),
  ])
  const pct = lvl.xpForNextLevel === 0 ? 0 : Math.round((lvl.xpIntoLevel / lvl.xpForNextLevel) * 100)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Bienvenido de nuevo 👋</h1>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <div className="flex items-center gap-4">
            <ProgressRing percent={pct} />
            <div>
              <div className="text-lg font-bold">Nivel {lvl.level}</div>
              <div className="text-sm" style={{ color: 'var(--muted)' }}>
                {lvl.xpIntoLevel} / {lvl.xpForNextLevel} XP · racha {profile.currentStreak} días
              </div>
            </div>
          </div>
        </Card>
        <Card>
          <div className="font-medium">Continuar</div>
          {lastUnit ? (
            <Link href={`/learn/${lastUnit.id}`} style={{ color: 'var(--primary)' }}>{lastUnit.title}</Link>
          ) : (
            <p className="text-sm" style={{ color: 'var(--muted)' }}>Aún no has empezado ninguna unidad.</p>
          )}
        </Card>
      </div>
      <div className="grid grid-cols-3 gap-4 text-sm">
        <Card><div style={{ color: 'var(--muted)' }}>Ejercicios hechos</div><div className="text-xl font-bold">{attemptCount}</div></Card>
        <Card><div style={{ color: 'var(--muted)' }}>Sesiones de speaking</div><div className="text-xl font-bold">{sessionCount}</div></Card>
        <Card><div style={{ color: 'var(--muted)' }}>XP total</div><div className="text-xl font-bold">{profile.xp}</div></Card>
      </div>
      <div className="flex gap-3">
        <Link href="/learn" style={{ color: 'var(--primary)' }}>Aprender</Link>
        <Link href="/speaking" style={{ color: 'var(--primary)' }}>Practicar speaking</Link>
        <Link href="/library" style={{ color: 'var(--primary)' }}>Biblioteca</Link>
      </div>
    </div>
  )
}

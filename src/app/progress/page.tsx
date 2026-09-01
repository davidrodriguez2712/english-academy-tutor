import { prisma } from '@/lib/db'
import { getProfile } from '@/lib/profile'
import { levelFromXp } from '@/lib/gamification/level'
import { Card } from '@/components/ui/Card'

export const dynamic = 'force-dynamic'

export default async function ProgressPage() {
  const profile = await getProfile()
  const lvl = levelFromXp(profile.xp)
  const [attempts, sessions, attemptCount, sessionCount] = await Promise.all([
    prisma.exerciseAttempt.findMany({
      orderBy: { completedAt: 'desc' },
      take: 20,
      include: { exerciseSet: { include: { unit: true } } },
    }),
    prisma.speakingSession.findMany({
      where: { status: 'COMPLETED' },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.exerciseAttempt.count(),
    prisma.speakingSession.count({ where: { status: 'COMPLETED' } }),
  ])

  const rows = [
    ...attempts.map((a) => ({
      date: a.completedAt,
      label: `Ejercicio · ${a.exerciseSet.unit.title} · ${a.exerciseSet.type} · ${a.score}%`,
      xp: a.xpEarned,
    })),
    ...sessions.map((s) => ({
      date: s.createdAt,
      label: `Speaking · ${s.topic} · ${s.mode === 'GUIDED' ? 'guiado' : 'monólogo'}`,
      xp: s.xpEarned,
    })),
  ]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 20)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Progreso</h1>
      <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
        <Card><div style={{ color: 'var(--muted)' }}>Nivel</div><div className="text-xl font-bold">{lvl.level}</div></Card>
        <Card><div style={{ color: 'var(--muted)' }}>XP total</div><div className="text-xl font-bold">{profile.xp}</div></Card>
        <Card><div style={{ color: 'var(--muted)' }}>Racha actual</div><div className="text-xl font-bold">{profile.currentStreak}</div></Card>
        <Card><div style={{ color: 'var(--muted)' }}>Racha máxima</div><div className="text-xl font-bold">{profile.longestStreak}</div></Card>
        <Card><div style={{ color: 'var(--muted)' }}>Ejercicios</div><div className="text-xl font-bold">{attemptCount}</div></Card>
        <Card><div style={{ color: 'var(--muted)' }}>Sesiones speaking</div><div className="text-xl font-bold">{sessionCount}</div></Card>
      </div>

      <Card>
        <div className="mb-2 font-medium">Historial reciente</div>
        <ul className="space-y-1 text-sm">
          {rows.map((r, i) => (
            <li key={i} className="flex justify-between">
              <span>{r.label}</span>
              <span style={{ color: 'var(--muted)' }}>
                {r.date.toLocaleDateString('es')} · +{r.xp} XP
              </span>
            </li>
          ))}
          {rows.length === 0 && <li style={{ color: 'var(--muted)' }}>Sin actividad todavía.</li>}
        </ul>
      </Card>
    </div>
  )
}

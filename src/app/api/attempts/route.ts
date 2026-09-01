import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { xpForExercise } from '@/lib/gamification/xp'
import { recordActivity } from '@/lib/profile'

export async function POST(req: NextRequest) {
  const { exerciseSetId, correctCount, totalCount, answers } = await req.json()
  const set = await prisma.exerciseSet.findUnique({ where: { id: exerciseSetId } })
  if (!set) return NextResponse.json({ error: 'Set no encontrado' }, { status: 404 })

  const tc = Math.max(0, Number(totalCount) || 0)
  const cc = Math.min(Math.max(0, Number(correctCount) || 0), tc)
  const score = tc === 0 ? 0 : Math.round((cc / tc) * 100)
  const xpEarned = xpForExercise(set.type, cc)

  await prisma.exerciseAttempt.create({
    data: {
      exerciseSetId,
      score,
      correctCount: cc,
      totalCount: tc,
      xpEarned,
      answers: JSON.stringify(answers ?? null),
    },
  })
  await recordActivity({ xp: xpEarned })
  return NextResponse.json({ score, xpEarned })
}

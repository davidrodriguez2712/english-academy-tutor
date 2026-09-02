import type { Profile } from '@prisma/client'
import { prisma } from './db'
import { dayDiff } from './dates'

export async function getProfile(): Promise<Profile> {
  return prisma.profile.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  })
}

export async function recordActivity(input: {
  xp: number
  now?: Date
}): Promise<Profile> {
  const now = input.now ?? new Date()
  return prisma.$transaction(async (tx) => {
    const current = await tx.profile.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1 },
    })

    let streak: number
    if (!current.lastActivityDate) {
      streak = 1
    } else {
      const diff = dayDiff(current.lastActivityDate, now)
      if (diff === 0) streak = current.currentStreak
      else if (diff === 1) streak = current.currentStreak + 1
      else streak = 1
    }

    return tx.profile.update({
      where: { id: 1 },
      data: {
        xp: current.xp + Math.max(0, input.xp),
        currentStreak: streak,
        longestStreak: Math.max(current.longestStreak, streak),
        lastActivityDate: now,
      },
    })
  })
}

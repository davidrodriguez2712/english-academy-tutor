import type { SpeakingMode } from '@prisma/client'

export function totalTurnsForMode(mode: SpeakingMode): number {
  return mode === 'GUIDED' ? 5 : 1
}

export function resolveTopic(input: {
  mode: SpeakingMode
  unitTitle?: string | null
  customTopic?: string | null
}): string {
  if (input.mode === 'GUIDED' && input.unitTitle?.trim()) {
    return input.unitTitle.trim()
  }
  const custom = input.customTopic?.trim()
  if (!custom) throw new Error('Escribe un tema para la sesión')
  return custom
}

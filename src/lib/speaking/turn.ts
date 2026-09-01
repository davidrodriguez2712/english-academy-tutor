type TurnLike = { index: number; assistantPrompt: string; userTranscript: string | null }

export function buildHistory(turns: TurnLike[]): { role: 'assistant' | 'user'; text: string }[] {
  const out: { role: 'assistant' | 'user'; text: string }[] = []
  for (const t of [...turns].sort((a, b) => a.index - b.index)) {
    out.push({ role: 'assistant', text: t.assistantPrompt })
    if (t.userTranscript) out.push({ role: 'user', text: t.userTranscript })
  }
  return out
}

export function nextTurnIndex(turns: { index: number }[]): number {
  return Math.max(0, ...turns.map((t) => t.index)) + 1
}

export function isSessionComplete(session: { totalTurns: number }, savedTurnCount: number): boolean {
  return savedTurnCount >= session.totalTurns
}

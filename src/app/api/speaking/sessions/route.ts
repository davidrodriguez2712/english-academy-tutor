import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { isAiEnabled } from '@/lib/ai/config'
import { generateGuidedOpener, synthesizeSpeech, AiError } from '@/lib/ai'
import { saveAudioFile } from '@/lib/storage'
import { resolveTopic, totalTurnsForMode } from '@/lib/speaking/session'

export async function POST(req: NextRequest) {
  const { mode, unitId, topic: customTopic } = await req.json()
  if (mode !== 'GUIDED' && mode !== 'MONOLOGUE') {
    return NextResponse.json({ error: 'Modo inválido' }, { status: 400 })
  }

  const unit = unitId ? await prisma.unit.findUnique({ where: { id: unitId } }) : null

  let topic: string
  try {
    topic = resolveTopic({ mode, unitTitle: unit?.title, customTopic })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }

  const totalTurns = totalTurnsForMode(mode)

  let firstPrompt = topic
  let firstAudio: string | null = null

  if (mode === 'GUIDED') {
    if (!isAiEnabled()) {
      return NextResponse.json({ error: 'La IA está desactivada (falta OPENAI_API_KEY)' }, { status: 503 })
    }
    try {
      firstPrompt = await generateGuidedOpener(topic)
      firstAudio = await saveAudioFile(await synthesizeSpeech(firstPrompt), 'mp3')
    } catch (err) {
      if (err instanceof AiError) {
        return NextResponse.json({ error: 'No se pudo iniciar la sesión, inténtalo de nuevo' }, { status: 502 })
      }
      throw err
    }
  }

  const session = await prisma.speakingSession.create({
    data: {
      mode,
      unitId: unit?.id ?? null,
      topic,
      totalTurns,
      turns: {
        create: { index: 1, assistantPrompt: firstPrompt, assistantAudioPath: firstAudio },
      },
    },
  })
  return NextResponse.json({ id: session.id })
}

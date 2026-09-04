import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { isAiEnabled } from '@/lib/ai/config'
import { transcribe, reviewSpeakingTurn, synthesizeSpeech, AiError } from '@/lib/ai'
import { saveAudioFile } from '@/lib/storage'
import { recordActivity } from '@/lib/profile'
import { XP_PER_SPEAKING_TURN } from '@/lib/gamification/xp'
import { buildHistory, isSessionComplete } from '@/lib/speaking/turn'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!isAiEnabled()) {
    return NextResponse.json({ error: 'La IA está desactivada (falta OPENAI_API_KEY)' }, { status: 503 })
  }

  const session = await prisma.speakingSession.findUnique({
    where: { id },
    include: { turns: { orderBy: { index: 'asc' } } },
  })
  if (!session) return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 })
  if (session.status === 'COMPLETED') {
    return NextResponse.json({ error: 'La sesión ya terminó' }, { status: 400 })
  }

  const open = session.turns.find((t) => t.userTranscript === null)
  if (!open) return NextResponse.json({ error: 'No hay turno abierto' }, { status: 400 })

  const form = await req.formData()
  const audio = form.get('audio')
  if (!(audio instanceof File)) {
    return NextResponse.json({ error: 'Falta el audio' }, { status: 400 })
  }
  const bytes = Buffer.from(await audio.arrayBuffer())

  // Todo el trabajo de IA ocurre antes de escribir en DB.
  let userAudioPath: string
  let transcript: string
  let review
  let naturalAudioPath: string
  let nextAudioPath: string | null = null
  try {
    userAudioPath = await saveAudioFile(bytes, 'webm')
    transcript = await transcribe(bytes)
    if (transcript.trim() === '') {
      return NextResponse.json(
        { error: 'No he detectado voz en la grabación. Vuelve a grabar.' },
        { status: 400 },
      )
    }
    review = await reviewSpeakingTurn({
      transcript,
      topic: session.topic,
      mode: session.mode,
      turnIndex: open.index,
      totalTurns: session.totalTurns,
      history: buildHistory(session.turns),
    })
    naturalAudioPath = await saveAudioFile(await synthesizeSpeech(review.naturalVersion), 'mp3')
    if (review.nextAssistantPrompt) {
      nextAudioPath = await saveAudioFile(await synthesizeSpeech(review.nextAssistantPrompt), 'mp3')
    }
  } catch (err) {
    if (err instanceof AiError) {
      return NextResponse.json({ error: 'No se pudo procesar el turno, inténtalo de nuevo' }, { status: 502 })
    }
    throw err
  }

  const savedCount = session.turns.filter((t) => t.userTranscript !== null).length + 1
  const complete = isSessionComplete(session, savedCount)

  const updatedTurn = await prisma.$transaction(async (tx) => {
    const turn = await tx.speakingTurn.update({
      where: { id: open.id },
      data: {
        userAudioPath,
        userTranscript: transcript,
        correctedText: review.correctedText,
        naturalVersion: review.naturalVersion,
        fluencyTip: review.fluencyTip,
        naturalAudioPath,
      },
    })
    if (review.nextAssistantPrompt) {
      await tx.speakingTurn.create({
        data: {
          sessionId: session.id,
          index: open.index + 1,
          assistantPrompt: review.nextAssistantPrompt,
          assistantAudioPath: nextAudioPath,
        },
      })
    }
    await tx.speakingSession.update({
      where: { id: session.id },
      data: {
        xpEarned: { increment: XP_PER_SPEAKING_TURN },
        status: complete ? 'COMPLETED' : 'IN_PROGRESS',
      },
    })
    return turn
  })

  await recordActivity({ xp: XP_PER_SPEAKING_TURN })

  return NextResponse.json({
    turn: {
      ...updatedTurn,
      nextAssistantPrompt: review.nextAssistantPrompt,
    },
    sessionStatus: complete ? 'COMPLETED' : 'IN_PROGRESS',
    xpEarned: XP_PER_SPEAKING_TURN,
  })
}

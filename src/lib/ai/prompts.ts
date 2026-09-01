import type { ExerciseType } from '@prisma/client'

const COUNTS: Record<ExerciseType, number> = {
  MULTIPLE_CHOICE: 10,
  FILL_BLANKS: 10,
  MATCHING: 8,
  ORDER_WORDS: 6,
  FLASHCARDS: 15,
}

const SHAPE: Record<ExerciseType, string> = {
  MULTIPLE_CHOICE:
    '{ "items": [{ "question": string, "options": string[4], "correctIndex": number (0-3), "explanation": string }] }',
  FILL_BLANKS:
    '{ "items": [{ "sentence": string con "___" para el hueco, "answer": string, "acceptedVariants": string[] }] }',
  MATCHING: '{ "items": [{ "left": string (término inglés), "right": string (definición o traducción) }] }',
  ORDER_WORDS:
    '{ "items": [{ "scrambled": string[] (palabras desordenadas), "correctOrder": string[] (mismas palabras ordenadas) }] }',
  FLASHCARDS: '{ "items": [{ "front": string (inglés), "back": string (español) }] }',
}

export function exercisePrompt(unitText: string, type: ExerciseType): { system: string; user: string } {
  return {
    system:
      'Eres un profesor de inglés que crea ejercicios a partir del texto de una unidad de un libro. ' +
      'Responde SOLO con JSON válido que cumpla exactamente la forma indicada. El contenido de los ejercicios está en inglés; las traducciones y definiciones en español.',
    user:
      `Crea ${COUNTS[type]} ítems de tipo ${type}.\n` +
      `Forma JSON exacta: ${SHAPE[type]}\n\n` +
      `Texto de la unidad:\n"""\n${unitText.slice(0, 8000)}\n"""`,
  }
}

export function guidedOpenerPrompt(topic: string): { system: string; user: string } {
  return {
    system:
      'Eres un tutor de conversación en inglés. Devuelve SOLO JSON: { "assistantPrompt": string }. ' +
      'assistantPrompt es una pregunta abierta y natural en inglés para iniciar una conversación sobre el tema dado.',
    user: `Tema: ${topic}`,
  }
}

export function turnReviewPrompt(input: {
  transcript: string
  topic: string
  mode: 'GUIDED' | 'MONOLOGUE'
  turnIndex: number
  totalTurns: number
  history: { role: 'assistant' | 'user'; text: string }[]
}): { system: string; user: string } {
  const wantNext = input.mode === 'GUIDED' && input.turnIndex < input.totalTurns
  return {
    system:
      'Eres un tutor de inglés que corrige la intervención hablada de un estudiante. ' +
      'Devuelve SOLO JSON con esta forma exacta: ' +
      '{ "correctedText": string, "naturalVersion": string, "fluencyTip": string, "nextAssistantPrompt": string | null }. ' +
      'correctedText: la frase del estudiante con la gramática corregida, mínimo cambio. ' +
      'naturalVersion: cómo lo diría un hablante nativo de forma natural. ' +
      'fluencyTip: un consejo breve y accionable en español. ' +
      (wantNext
        ? 'nextAssistantPrompt: la siguiente pregunta del tutor en inglés para continuar la conversación.'
        : 'nextAssistantPrompt: debe ser null.'),
    user:
      `Tema: ${input.topic}\nTurno ${input.turnIndex} de ${input.totalTurns}\n` +
      `Historial:\n${input.history.map((h) => `${h.role}: ${h.text}`).join('\n')}\n\n` +
      `Transcripción de lo que dijo el estudiante en este turno:\n"${input.transcript}"`,
  }
}

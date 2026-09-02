import type { ExerciseType } from '@prisma/client'
import type { PageSlice } from '@/lib/pdf'

const COUNTS: Record<ExerciseType, number> = {
  MULTIPLE_CHOICE: 10,
  FILL_BLANKS: 10,
  MATCHING: 8,
  ORDER_WORDS: 6,
  FLASHCARDS: 15,
}

const SHAPE: Record<ExerciseType, string> = {
  MULTIPLE_CHOICE:
    '{ "items": [{ "question": string, "options": string[4], "correctIndex": number (0-3), "explanation": string, "page"?: number }] }',
  FILL_BLANKS:
    '{ "items": [{ "sentence": string con "___" para el hueco, "answer": string, "acceptedVariants": string[], "page"?: number }] }',
  MATCHING: '{ "items": [{ "left": string (término inglés), "right": string (definición o traducción) }] }',
  ORDER_WORDS:
    '{ "items": [{ "scrambled": string[] (palabras desordenadas), "correctOrder": string[] (mismas palabras ordenadas) }] }',
  FLASHCARDS: '{ "items": [{ "front": string (inglés), "back": string (español) }] }',
}

const PAGE_AWARE: Partial<Record<ExerciseType, true>> = {
  MULTIPLE_CHOICE: true,
  FILL_BLANKS: true,
}

export function exercisePrompt(
  unitText: string,
  type: ExerciseType,
  pages?: PageSlice[],
): { system: string; user: string } {
  const usePages = Boolean(pages && pages.length > 0 && PAGE_AWARE[type])
  const textBlock = usePages
    ? pages!.map((p) => `=== Página ${p.page} ===\n${p.text}`).join('\n\n').slice(0, 8000)
    : unitText.slice(0, 8000)
  const pageHint = usePages
    ? 'Si una pregunta se apoya en un pasaje concreto, añade "page" con el número de la página mostrada sobre ese pasaje. Si la pregunta es general, omite "page".\n\n'
    : ''
  return {
    system:
      'Eres un profesor de inglés que crea ejercicios a partir del texto de una unidad de un libro. ' +
      'Responde SOLO con JSON válido que cumpla exactamente la forma indicada. El contenido de los ejercicios está en inglés; las traducciones y definiciones en español.',
    user:
      `Crea ${COUNTS[type]} ítems de tipo ${type}.\n` +
      `Forma JSON exacta: ${SHAPE[type]}\n\n` +
      pageHint +
      `Texto de la unidad:\n"""\n${textBlock}\n"""`,
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

export function vocabPrompt(word: string): { system: string; user: string } {
  return {
    system:
      'Eres un diccionario para un estudiante hispanohablante de inglés. ' +
      'Responde SOLO con JSON válido con esta forma exacta: ' +
      '{ "translation": string, "meaning": string, "partOfSpeech": string, "ipa": string, "examples": string[] }. ' +
      'translation: la traducción al español. ' +
      'meaning: la definición en inglés. ' +
      'partOfSpeech: la categoría gramatical en inglés (noun, verb, adjective, adverb, phrase, phrasal verb, idiom...). ' +
      'ipa: la transcripción fonética entre barras, p. ej. /ˈwɜːrd/. ' +
      'examples: al menos 3 frases de ejemplo en inglés que usen la palabra o expresión.',
    user: `Palabra o expresión: "${word}"`,
  }
}

export function unitVocabPrompt(unitText: string): { system: string; user: string } {
  return {
    system:
      'Eres un profesor de inglés que, a partir del texto de una unidad de un libro, ' +
      'selecciona el vocabulario clave que un estudiante hispanohablante debería estudiar. ' +
      'Responde SOLO con JSON válido con esta forma exacta: ' +
      '{ "items": [{ "word": string, "translation": string, "meaning": string, "partOfSpeech": string, "ipa": string, "examples": string[] }] }. ' +
      'word: la palabra o expresión en inglés tal como aparece en el texto. ' +
      'translation: su traducción al español. ' +
      'meaning: la definición en inglés. ' +
      'partOfSpeech: la categoría gramatical en inglés (noun, verb, adjective, adverb, phrase, phrasal verb, idiom...). ' +
      'ipa: la transcripción fonética entre barras. ' +
      'examples: al menos 3 frases de ejemplo en inglés. ' +
      'Incluye entre 12 y 20 términos, prioriza los más útiles y los que aparecen en el texto de la unidad.',
    user: `Texto de la unidad:\n"""\n${unitText.slice(0, 8000)}\n"""`,
  }
}

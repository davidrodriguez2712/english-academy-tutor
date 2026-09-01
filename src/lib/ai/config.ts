export const MODELS = {
  stt: 'gpt-4o-transcribe',
  chat: 'gpt-4o',
  tts: 'gpt-4o-mini-tts',
} as const

export const TTS_VOICE = 'alloy'

export function isAiEnabled(): boolean {
  return Boolean(process.env.OPENAI_API_KEY)
}

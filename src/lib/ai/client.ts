import OpenAI from 'openai'

let cached: OpenAI | null = null

export function openai(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY no está configurada')
  }
  cached ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  return cached
}

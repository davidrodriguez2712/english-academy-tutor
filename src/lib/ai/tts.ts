import { openai } from './client'
import { MODELS, TTS_VOICE } from './config'
import { withRetry } from './retry'

export async function synthesizeSpeech(text: string): Promise<Buffer> {
  return withRetry(async () => {
    const res = await openai().audio.speech.create({
      model: MODELS.tts,
      voice: TTS_VOICE,
      input: text,
      response_format: 'mp3',
    })
    return Buffer.from(await res.arrayBuffer())
  }, 'synthesizeSpeech')
}

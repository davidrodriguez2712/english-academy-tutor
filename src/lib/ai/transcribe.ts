import { toFile } from 'openai'
import { openai } from './client'
import { MODELS } from './config'
import { withRetry } from './retry'

export async function transcribe(audio: Buffer, filename = 'audio.webm'): Promise<string> {
  return withRetry(async () => {
    const file = await toFile(audio, filename, { type: 'audio/webm' })
    const res = await openai().audio.transcriptions.create({
      model: MODELS.stt,
      file,
    })
    return res.text.trim()
  }, 'transcribe')
}

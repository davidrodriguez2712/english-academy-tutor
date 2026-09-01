import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join, resolve, sep } from 'node:path'
import { randomUUID } from 'node:crypto'

export const STORAGE_ROOT = join(process.cwd(), 'storage')
export const BOOKS_DIR = join(STORAGE_ROOT, 'books')
export const AUDIO_DIR = join(STORAGE_ROOT, 'audio')

async function ensure(dir: string) {
  await mkdir(dir, { recursive: true })
}

function sanitize(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 60)
}

export async function saveBookFile(bytes: Buffer, originalName: string) {
  await ensure(BOOKS_DIR)
  const filename = `${randomUUID()}-${sanitize(originalName)}`
  const path = join(BOOKS_DIR, filename)
  await writeFile(path, bytes)
  return { path, filename }
}

export async function saveAudioFile(bytes: Buffer, ext: 'webm' | 'mp3'): Promise<string> {
  const id = randomUUID()
  const sub = id.slice(0, 2)
  await ensure(join(AUDIO_DIR, sub))
  const rel = join(sub, `${id}.${ext}`)
  await writeFile(join(AUDIO_DIR, rel), bytes)
  return rel
}

export async function readAudioFile(relPath: string): Promise<Buffer> {
  const abs = resolve(AUDIO_DIR, relPath)
  if (abs !== AUDIO_DIR && !abs.startsWith(AUDIO_DIR + sep)) {
    throw new Error('ruta de audio inválida')
  }
  return readFile(abs)
}

import { NextRequest } from 'next/server'
import { readAudioFile } from '@/lib/storage'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params
  try {
    const buf = await readAudioFile(path.join('/'))
    const ext = path[path.length - 1].split('.').pop()
    return new Response(new Uint8Array(buf), {
      headers: { 'Content-Type': ext === 'mp3' ? 'audio/mpeg' : 'audio/webm' },
    })
  } catch {
    return new Response('No encontrado', { status: 404 })
  }
}

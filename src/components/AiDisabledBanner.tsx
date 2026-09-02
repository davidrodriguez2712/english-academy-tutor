import { isAiEnabled } from '@/lib/ai/config'
export function AiDisabledBanner() {
  if (isAiEnabled()) return null
  return (
    <div className="px-6 py-2 text-sm" style={{ background: 'var(--warning)', color: '#1b1b2f' }}>
      Falta <code>OPENAI_API_KEY</code>. Las funciones de IA (generar ejercicios, corregir speaking) están
      desactivadas. Añádela en <code>.env.local</code> y reinicia.
    </div>
  )
}

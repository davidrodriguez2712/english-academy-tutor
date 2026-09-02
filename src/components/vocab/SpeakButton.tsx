'use client'
import { useEffect, useState } from 'react'

export function SpeakButton({ text }: { text: string }) {
  const [supported, setSupported] = useState(false)
  useEffect(() => {
    // Detección solo en cliente para evitar desajuste de hidratación.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(typeof window !== 'undefined' && 'speechSynthesis' in window)
  }, [])

  function speak() {
    if (!supported) return
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'en-US'
    const voice = window.speechSynthesis.getVoices().find((v) => v.lang.startsWith('en'))
    if (voice) u.voice = voice
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(u)
  }

  return (
    <button
      type="button"
      onClick={speak}
      disabled={!supported}
      aria-label="Escuchar pronunciación"
      title={supported ? 'Escuchar pronunciación' : 'Tu navegador no soporta síntesis de voz'}
      className="disabled:opacity-40"
      style={{ color: 'var(--primary)' }}
    >
      🔊
    </button>
  )
}

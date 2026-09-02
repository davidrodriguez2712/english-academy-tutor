'use client'
import { useTheme } from './Providers'

export function ThemeToggle() {
  const { theme, toggle } = useTheme()
  return (
    <button onClick={toggle} className="text-sm" style={{ color: 'var(--muted)' }}>
      {theme === 'dark' ? '☀️ Claro' : '🌙 Oscuro'}
    </button>
  )
}

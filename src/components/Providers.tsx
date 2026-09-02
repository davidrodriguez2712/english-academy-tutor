'use client'
import { useSyncExternalStore } from 'react'

type Theme = 'light' | 'dark'

// Tema propio (reemplaza next-themes, que renderiza un <script> dentro de un
// componente cliente y dispara un error de consola con React 19).
// Fuente única de verdad: la clase `dark` en <html>. El <script> de bloqueo de
// `layout.tsx` (server component) la aplica antes del primer pintado leyendo
// localStorage. `useSyncExternalStore` + `getServerSnapshot` evita el mismatch
// de hidratación sin necesidad de un guard `mounted`.

const listeners = new Set<() => void>()

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

function getSnapshot(): Theme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

function getServerSnapshot(): Theme {
  return 'light'
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.classList.toggle('dark', next === 'dark')
    try {
      localStorage.setItem('theme', next)
    } catch {
      /* modo privado / almacenamiento bloqueado */
    }
    listeners.forEach((l) => l())
  }
  return { theme, toggle }
}

export function Providers({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

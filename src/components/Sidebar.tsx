'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ThemeToggle } from './ThemeToggle'

const LINKS = [
  { href: '/', label: 'Inicio' },
  { href: '/learn', label: 'Aprender' },
  { href: '/vocab', label: 'Vocabulario' },
  { href: '/speaking', label: 'Practicar speaking' },
  { href: '/library', label: 'Biblioteca' },
  { href: '/progress', label: 'Progreso' },
]

export function Sidebar() {
  const path = usePathname()
  return (
    <aside
      className="flex w-56 shrink-0 flex-col justify-between border-r p-4"
      style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
    >
      <nav className="flex flex-col gap-1">
        <div className="mb-4 text-lg font-bold" style={{ color: 'var(--primary)' }}>
          English Academy Tutor
        </div>
        {LINKS.map((l) => {
          const active = l.href === '/' ? path === '/' : path.startsWith(l.href)
          return (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-lg px-3 py-2 text-sm"
              style={{
                background: active ? 'var(--primary)' : 'transparent',
                color: active ? 'var(--primary-contrast)' : 'var(--text)',
              }}
            >
              {l.label}
            </Link>
          )
        })}
      </nav>
      <ThemeToggle />
    </aside>
  )
}

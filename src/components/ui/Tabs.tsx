'use client'
export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: string; label: string }[]
  active: string
  onChange: (id: string) => void
}) {
  return (
    <div className="flex gap-2 border-b" style={{ borderColor: 'var(--border)' }}>
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className="px-3 py-2 text-sm"
          style={{
            color: active === t.id ? 'var(--primary)' : 'var(--muted)',
            borderBottom: active === t.id ? '2px solid var(--primary)' : '2px solid transparent',
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

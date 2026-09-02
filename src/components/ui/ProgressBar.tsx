export function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max <= 0 ? 0 : Math.min(100, Math.round((value / max) * 100))
  return (
    <div className="h-2 w-full rounded-full" style={{ background: 'var(--border)' }}>
      <div className="h-2 rounded-full" style={{ width: `${pct}%`, background: 'var(--primary)' }} />
    </div>
  )
}

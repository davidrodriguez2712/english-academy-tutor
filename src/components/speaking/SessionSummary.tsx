// Stub temporal — Task 19 sustituye este archivo por el resumen completo.
/* eslint-disable @typescript-eslint/no-explicit-any */
export function SessionSummary({ session }: { session: any }) {
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-bold">Sesión completada</h1>
      <p className="text-sm" style={{ color: 'var(--muted)' }}>Tema: {session.topic}</p>
    </div>
  )
}

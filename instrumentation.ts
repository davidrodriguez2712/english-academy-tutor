export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return

  try {
    const { recoverOrphanBooks } = await import('@/lib/books/recover-orphans')
    const { recovered, failed } = await recoverOrphanBooks()

    if (recovered.length > 0) {
      console.log(
        `[recuperación] ${recovered.length} libro(s) recuperado(s) de subidas incompletas: ${recovered.join(', ')}`,
      )
    }
    if (failed.length > 0) {
      console.error(`[recuperación] no se pudo recuperar ${failed.length} archivo(s) huérfano(s):`, failed)
    }
  } catch (err) {
    console.error('[recuperación] chequeo de libros huérfanos falló al arrancar:', err)
  }
}

export class AiError extends Error {
  label: string
  constructor(label: string, cause?: unknown) {
    super(`Fallo en la operación de IA: ${label}`)
    this.name = 'AiError'
    this.label = label
    this.cause = cause
  }
}

const RETRY_DELAY_MS = 400

export async function withRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
  try {
    return await fn()
  } catch {
    await new Promise((r) => setTimeout(r, RETRY_DELAY_MS))
    try {
      return await fn()
    } catch (err) {
      throw new AiError(label, err)
    }
  }
}

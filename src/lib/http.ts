export async function errorFrom(res: Response): Promise<string> {
  try {
    const j = await res.json()
    return j?.error ?? `Error ${res.status}`
  } catch {
    return `Error ${res.status}`
  }
}

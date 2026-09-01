export function normalizeAnswer(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

export function isFillBlankCorrect(
  user: string,
  answer: string,
  acceptedVariants: string[],
): boolean {
  const n = normalizeAnswer(user)
  if (n === '') return false
  return [answer, ...acceptedVariants].some((a) => normalizeAnswer(a) === n)
}

import { isFillBlankCorrect } from './normalize'

export type GradeResult = {
  correctCount: number
  totalCount: number
  score: number
}

function result(correctCount: number, totalCount: number): GradeResult {
  return {
    correctCount,
    totalCount,
    score: totalCount === 0 ? 0 : Math.round((correctCount / totalCount) * 100),
  }
}

export function gradeMultipleChoice(
  answers: (number | null)[],
  questions: { correctIndex: number }[],
): GradeResult {
  const correct = questions.reduce(
    (acc, q, i) => acc + (answers[i] === q.correctIndex ? 1 : 0),
    0,
  )
  return result(correct, questions.length)
}

export function gradeFillBlanks(
  answers: string[],
  items: { answer: string; acceptedVariants: string[] }[],
): GradeResult {
  const correct = items.reduce(
    (acc, it, i) =>
      acc + (isFillBlankCorrect(answers[i] ?? '', it.answer, it.acceptedVariants) ? 1 : 0),
    0,
  )
  return result(correct, items.length)
}

export function gradeOrderWords(
  answers: string[][],
  items: { correctOrder: string[] }[],
): GradeResult {
  const correct = items.reduce((acc, it, i) => {
    const a = answers[i] ?? []
    const ok =
      a.length === it.correctOrder.length &&
      a.every((w, j) => w === it.correctOrder[j])
    return acc + (ok ? 1 : 0)
  }, 0)
  return result(correct, items.length)
}

export function gradeMatching(
  userPairs: Record<number, number | undefined>,
  pairCount: number,
): GradeResult {
  let correct = 0
  for (let i = 0; i < pairCount; i++) {
    if (userPairs[i] === i) correct++
  }
  return result(correct, pairCount)
}

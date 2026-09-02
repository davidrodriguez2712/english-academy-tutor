export const multipleChoice = {
  items: Array.from({ length: 10 }, (_, i) => ({
    question: `Question ${i + 1}?`,
    options: ['A', 'B', 'C', 'D'],
    correctIndex: 1,
    explanation: 'Because B.',
  })),
}

export const fillBlanks = {
  items: Array.from({ length: 10 }, (_, i) => ({
    sentence: `He ___ to school yesterday (${i}).`,
    answer: 'went',
    acceptedVariants: ['walked'],
  })),
}

export const matching = {
  items: Array.from({ length: 8 }, (_, i) => ({ left: `term ${i}`, right: `def ${i}` })),
}

export const orderWords = {
  items: Array.from({ length: 6 }, () => ({
    scrambled: ['school', 'to', 'goes', 'she'],
    correctOrder: ['she', 'goes', 'to', 'school'],
  })),
}

export const flashcards = {
  items: Array.from({ length: 15 }, (_, i) => ({ front: `word ${i}`, back: `palabra ${i}` })),
}

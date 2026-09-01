import { describe, it, expect, vi, beforeEach } from 'vitest'

const create = vi.fn()
vi.mock('./client', () => ({
  openai: () => ({ chat: { completions: { create } } }),
}))

import { generateExercises } from './exercises'
import * as fx from '@/lib/validation/fixtures/exercises'

beforeEach(() => create.mockReset())

describe('generateExercises', () => {
  it('parsea y valida la respuesta del modelo', async () => {
    create.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(fx.flashcards) } }],
    })
    const content = await generateExercises('texto', 'FLASHCARDS')
    expect(content.items).toHaveLength(15)
  })

  it('lanza AiError si el JSON no valida (tras el reintento)', async () => {
    create.mockResolvedValue({ choices: [{ message: { content: '{"items":[]}' } }] })
    await expect(generateExercises('t', 'MATCHING')).rejects.toMatchObject({
      name: 'AiError',
      label: 'generateExercises',
    })
    expect(create).toHaveBeenCalledTimes(2)
  })
})

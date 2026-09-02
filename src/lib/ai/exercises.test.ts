import { describe, it, expect, vi, beforeEach } from 'vitest'

const create = vi.fn()
vi.mock('./client', () => ({
  openai: () => ({ chat: { completions: { create } } }),
}))

import { generateExercises } from './exercises'
import { exercisePrompt } from './prompts'
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

describe('exercisePrompt con páginas', () => {
  it('incluye marcadores de página para opción múltiple', () => {
    const { user } = exercisePrompt('', 'MULTIPLE_CHOICE', [{ page: 7, text: 'hello world' }])
    expect(user).toContain('=== Página 7 ===')
    expect(user).toContain('"page"')
  })
  it('ignora las páginas para matching', () => {
    const { user } = exercisePrompt('texto plano', 'MATCHING', [{ page: 7, text: 'hello' }])
    expect(user).not.toContain('=== Página 7 ===')
  })
  it('sin páginas usa el texto plano de la unidad', () => {
    const { user } = exercisePrompt('texto de la unidad', 'MULTIPLE_CHOICE')
    expect(user).toContain('texto de la unidad')
    expect(user).not.toContain('=== Página')
  })
})

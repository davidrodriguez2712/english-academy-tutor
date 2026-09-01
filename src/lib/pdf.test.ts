import { describe, it, expect } from 'vitest'
import { readFile } from 'node:fs/promises'
import { extractPdf, sliceUnitText } from './pdf'

describe('extractPdf', () => {
  it('extrae texto por página del PDF de fixture', async () => {
    const bytes = new Uint8Array(await readFile('test/fixtures/sample.pdf'))
    const { pages, totalPages } = await extractPdf(bytes)
    expect(totalPages).toBe(2)
    expect(pages[0].toLowerCase()).toContain('daily routines')
    expect(pages[1].toLowerCase()).toContain('hobbies')
  })
})

describe('sliceUnitText', () => {
  const pages = ['uno', 'dos', 'tres', 'cuatro']
  it('une el rango 1-indexado inclusive', () => {
    expect(sliceUnitText(pages, 2, 3)).toBe('dos\n\ntres')
  })
  it('una sola página', () => {
    expect(sliceUnitText(pages, 1, 1)).toBe('uno')
  })
  it('clampa endPage al total', () => {
    expect(sliceUnitText(pages, 3, 99)).toBe('tres\n\ncuatro')
  })
  it('lanza si startPage > endPage', () => {
    expect(() => sliceUnitText(pages, 3, 2)).toThrow()
  })
})

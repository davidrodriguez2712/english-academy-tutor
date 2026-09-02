# Base de vocabulario + referencias de página — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir una pestaña "Vocabulario" con una tabla acumulada que la IA enriquece por palabra, y permitir que los ejercicios de opción múltiple y de rellenar huecos citen la página del libro.

**Architecture:** Dos partes independientes. (A) Nuevo modelo Prisma `VocabEntry`, módulo IA `enrichVocab` con el mismo patrón que `generateExercises`, rutas REST bajo `/api/vocab`, y una tabla cliente con voz del navegador para la pronunciación. (B) Se reconstruye el texto por página desde `Book.rawText` (ya es `JSON.stringify(pages)`), el prompt de ejercicios pasa a ser consciente de páginas para MCQ y fill-blanks, y el campo `page` opcional viaja en el JSON validado y se pinta en la UI.

**Tech Stack:** Next.js 16 (App Router, route handlers), TypeScript, Prisma 6 + SQLite, OpenAI SDK (`MODELS.chat`), Zod 4, Vitest (node env), Tailwind 4.

**Spec:** `docs/superpowers/specs/2026-09-02-vocabulario-y-referencias-pagina-design.md`

## Global Constraints

- Idioma de todo el contenido y los mensajes: español, salvo el contenido en inglés de las fichas (significado, tipo, ejemplos) y de los ejercicios.
- Acceso a IA solo tras `src/lib/ai/*`. Sin `OPENAI_API_KEY` (`isAiEnabled()` falso) la app arranca; las acciones de IA responden 503 con aviso claro.
- Prohibido `alert()`, `confirm()`, `prompt()` y cualquier diálogo modal del navegador (bloquean el entorno). Confirmación de borrado inline.
- App `force-dynamic` de principio a fin. Usuario único, sin login.
- Tests solo para lógica pura, validación Zod y módulos de IA (cliente OpenAI mockeado). Rutas y componentes React NO se testean (convención del repo). La lógica testeable se extrae a `src/lib/`.
- Zod es v4. Prisma sobre SQLite no soporta `mode: 'insensitive'`; `contains` genera `LIKE '%x%'`, insensible a mayúsculas solo para ASCII — aceptable.
- Comandos: `npm test` (Vitest), `npm run lint`, `npm run build`, `npx tsc --noEmit` (typecheck), `npx prisma migrate dev --name <n>`.
- Cada commit termina con estos dos trailers (van como `-m` separados):
  - `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`
  - `Claude-Session: https://claude.ai/code/session_01FzeTNzF6Lprnnn7kSTAvTu`
- Estilo de mensaje de commit: `feat(vocabulario): …` / `feat(ejercicios): …`, en minúscula, en español.
- Trabajar en la rama `feat-vocabulario-referencias-pagina` creada desde `dev`.

---

## Estructura de ficheros

**Parte A — Vocabulario**

| Fichero | Responsabilidad |
|---|---|
| `prisma/schema.prisma` (mod.) | Enum `WordStatus` + modelo `VocabEntry`. |
| `src/lib/vocab/entry.ts` (nuevo) | Lógica pura: `normalizeWord`, `serializeExamples`, `deserializeExamples`, `toVocabDTO` + tipo `VocabEntryDTO`. |
| `src/lib/vocab/entry.test.ts` (nuevo) | Tests de lo anterior. |
| `src/lib/validation/vocab.ts` (nuevo) | Schema Zod `vocabEnrichmentSchema`, `parseVocabEnrichment`, tipo `VocabEnrichment`. |
| `src/lib/validation/vocab.test.ts` (nuevo) | Tests del schema. |
| `src/lib/ai/prompts.ts` (mod.) | Nueva función `vocabPrompt(word)`. |
| `src/lib/ai/vocab.ts` (nuevo) | `enrichVocab(word)` — llamada al modelo + validación + retry. |
| `src/lib/ai/vocab.test.ts` (nuevo) | Tests con cliente mockeado. |
| `src/lib/ai/index.ts` (mod.) | Re-exporta `enrichVocab`. |
| `src/app/api/vocab/route.ts` (nuevo) | `GET` (listar/filtrar), `POST` (crear + enriquecer). |
| `src/app/api/vocab/[id]/route.ts` (nuevo) | `PATCH` (estado), `DELETE`. |
| `src/app/api/vocab/[id]/regenerate/route.ts` (nuevo) | `POST` (re-enriquecer). |
| `src/app/vocab/page.tsx` (nuevo) | Server component: carga inicial + `<VocabTable>`. |
| `src/components/vocab/VocabTable.tsx` (nuevo) | Tabla cliente: alta, búsqueda/filtro, estado, regenerar, borrar. |
| `src/components/vocab/SpeakButton.tsx` (nuevo) | Botón 🔊 con `window.speechSynthesis`. |
| `src/components/Sidebar.tsx` (mod.) | Enlace "Vocabulario". |

**Parte B — Referencias de página**

| Fichero | Responsabilidad |
|---|---|
| `src/lib/pdf.ts` (mod.) | Nueva `sliceUnitPages` + tipo exportado `PageSlice`. |
| `src/lib/pdf.test.ts` (mod.) | Tests de `sliceUnitPages`. |
| `src/lib/validation/exercises.ts` (mod.) | Campo `page` opcional en items de MCQ y fill-blanks. |
| `src/lib/validation/exercises.test.ts` (mod.) | Tests del campo `page`. |
| `src/lib/ai/prompts.ts` (mod.) | `exercisePrompt` consciente de páginas (3er parámetro). |
| `src/lib/ai/exercises.ts` (mod.) | `generateExercises` acepta `opts.pages`. |
| `src/lib/ai/exercises.test.ts` (mod.) | Tests del prompt con páginas. |
| `src/app/api/units/[id]/exercises/route.ts` (mod.) | Pasa páginas a `generateExercises` para MCQ/fill-blanks. |
| `src/components/exercises/MultipleChoice.tsx` (mod.) | Muestra "(pág. N)". |
| `src/components/exercises/FillBlanks.tsx` (mod.) | Muestra "(pág. N)". |

`PageSlice` (definido en Task 6) lo consumen Tasks 7 y 8.

---

## Task 1: Modelo Prisma `VocabEntry`

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_add_vocab_entry/` (lo genera Prisma)

**Interfaces:**
- Produces: modelo Prisma `VocabEntry` y enum `WordStatus` disponibles vía `@prisma/client` (`prisma.vocabEntry`, tipo `VocabEntry`, tipo `WordStatus`).

- [ ] **Step 1: Crear la rama**

```bash
git checkout dev
git checkout -b feat-vocabulario-referencias-pagina
```

- [ ] **Step 2: Añadir el enum y el modelo al final de `prisma/schema.prisma`**

```prisma
enum WordStatus {
  IN_PROGRESS
  LEARNED
}

model VocabEntry {
  id           String     @id @default(cuid())
  word         String     @unique // clave normalizada: minúsculas + trim + espacios colapsados
  displayWord  String              // tal como lo escribió el usuario
  translation  String              // español
  meaning      String              // inglés
  partOfSpeech String              // "noun" | "verb" | "adjective" | "adverb" | "phrase" | ...
  ipa          String              // p. ej. /ˈwɜːrd/
  examples     String              // JSON: string[] (mín. 3), en inglés
  status       WordStatus @default(IN_PROGRESS)
  createdAt    DateTime   @default(now())
}
```

- [ ] **Step 3: Generar la migración**

Run: `npx prisma migrate dev --name add_vocab_entry`
Expected: crea la carpeta de migración, aplica en `prisma/dev.db`, y ejecuta `prisma generate` sin errores.

- [ ] **Step 4: Verificar que el cliente tipa el modelo**

Run: `npx tsc --noEmit`
Expected: PASS (0 errores).

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(vocabulario): modelo VocabEntry y enum WordStatus" \
  -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>" \
  -m "Claude-Session: https://claude.ai/code/session_01FzeTNzF6Lprnnn7kSTAvTu"
```

---

## Task 2: Lógica pura de vocabulario

**Files:**
- Create: `src/lib/vocab/entry.ts`
- Test: `src/lib/vocab/entry.test.ts`

**Interfaces:**
- Consumes: tipo `VocabEntry` de `@prisma/client` (Task 1).
- Produces:
  - `normalizeWord(raw: string): string` — trim + minúsculas + espacios colapsados a uno; lanza `Error` si queda vacío.
  - `serializeExamples(examples: string[]): string` — valida ≥3 strings no vacías; devuelve JSON; lanza si no cumple.
  - `deserializeExamples(raw: string): string[]` — `JSON.parse` + valida array de ≥3 strings; lanza si no cumple.
  - `type VocabEntryDTO = Omit<VocabEntry, 'examples' | 'word'> & { examples: string[] }`
  - `toVocabDTO(entry: VocabEntry): VocabEntryDTO` — reemplaza `examples` (string JSON) por `string[]` y quita `word`.

- [ ] **Step 1: Escribir el test que falla**

```ts
// src/lib/vocab/entry.test.ts
import { describe, it, expect } from 'vitest'
import {
  normalizeWord,
  serializeExamples,
  deserializeExamples,
  toVocabDTO,
} from './entry'

describe('normalizeWord', () => {
  it('recorta, pasa a minúsculas y colapsa espacios', () => {
    expect(normalizeWord('  Take   Off ')).toBe('take off')
  })
  it('lanza si queda vacío', () => {
    expect(() => normalizeWord('   ')).toThrow()
  })
})

describe('serializeExamples / deserializeExamples', () => {
  const three = ['One sentence.', 'Two sentences.', 'Three sentences.']
  it('ida y vuelta preserva el array', () => {
    expect(deserializeExamples(serializeExamples(three))).toEqual(three)
  })
  it('serializeExamples rechaza menos de 3', () => {
    expect(() => serializeExamples(['a', 'b'])).toThrow()
  })
  it('serializeExamples rechaza strings vacías', () => {
    expect(() => serializeExamples(['a', 'b', '  '])).toThrow()
  })
  it('deserializeExamples rechaza JSON que no es array de strings', () => {
    expect(() => deserializeExamples('{"x":1}')).toThrow()
    expect(() => deserializeExamples('["a","b"]')).toThrow()
  })
})

describe('toVocabDTO', () => {
  it('convierte examples a array y omite word', () => {
    const dto = toVocabDTO({
      id: 'c1',
      word: 'take off',
      displayWord: 'take off',
      translation: 'despegar',
      meaning: 'to leave the ground',
      partOfSpeech: 'phrasal verb',
      ipa: '/teɪk ɒf/',
      examples: JSON.stringify(['The plane took off.', 'We took off early.', 'It took off fast.']),
      status: 'IN_PROGRESS',
      createdAt: new Date('2026-09-02T00:00:00Z'),
    })
    expect(dto.examples).toHaveLength(3)
    expect(dto.displayWord).toBe('take off')
    expect('word' in dto).toBe(false)
  })
})
```

- [ ] **Step 2: Ejecutar el test para verlo fallar**

Run: `npm test -- src/lib/vocab/entry.test.ts`
Expected: FAIL ("Cannot find module './entry'").

- [ ] **Step 3: Implementar `src/lib/vocab/entry.ts`**

```ts
import type { VocabEntry } from '@prisma/client'

export function normalizeWord(raw: string): string {
  const n = raw.trim().toLowerCase().replace(/\s+/g, ' ')
  if (!n) throw new Error('palabra vacía')
  return n
}

function isNonEmptyStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((e) => typeof e === 'string' && e.trim().length > 0)
}

export function serializeExamples(examples: string[]): string {
  if (!isNonEmptyStringArray(examples) || examples.length < 3) {
    throw new Error('se requieren al menos 3 ejemplos no vacíos')
  }
  return JSON.stringify(examples)
}

export function deserializeExamples(raw: string): string[] {
  const parsed = JSON.parse(raw)
  if (!isNonEmptyStringArray(parsed) || parsed.length < 3) {
    throw new Error('ejemplos inválidos en base de datos')
  }
  return parsed
}

export type VocabEntryDTO = Omit<VocabEntry, 'examples' | 'word'> & { examples: string[] }

export function toVocabDTO(entry: VocabEntry): VocabEntryDTO {
  const { examples, word: _word, ...rest } = entry
  void _word
  return { ...rest, examples: deserializeExamples(examples) }
}
```

- [ ] **Step 4: Ejecutar los tests**

Run: `npm test -- src/lib/vocab/entry.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/vocab
git commit -m "feat(vocabulario): lógica pura de normalización y ejemplos" \
  -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>" \
  -m "Claude-Session: https://claude.ai/code/session_01FzeTNzF6Lprnnn7kSTAvTu"
```

---

## Task 3: Schema Zod del enriquecimiento

**Files:**
- Create: `src/lib/validation/vocab.ts`
- Test: `src/lib/validation/vocab.test.ts`

**Interfaces:**
- Produces:
  - `vocabEnrichmentSchema` (Zod object).
  - `type VocabEnrichment = { translation: string; meaning: string; partOfSpeech: string; ipa: string; examples: string[] }`
  - `parseVocabEnrichment(raw: unknown): VocabEnrichment` — lanza `ZodError` si no valida.

- [ ] **Step 1: Escribir el test que falla**

```ts
// src/lib/validation/vocab.test.ts
import { describe, it, expect } from 'vitest'
import { vocabEnrichmentSchema, parseVocabEnrichment } from './vocab'

const valid = {
  translation: 'despegar',
  meaning: 'to leave the ground and begin to fly',
  partOfSpeech: 'phrasal verb',
  ipa: '/teɪk ɒf/',
  examples: ['The plane took off.', 'We took off at dawn.', 'The rocket took off.'],
}

describe('vocabEnrichmentSchema', () => {
  it('acepta un payload completo', () => {
    expect(vocabEnrichmentSchema.safeParse(valid).success).toBe(true)
  })
  it('rechaza menos de 3 ejemplos', () => {
    expect(vocabEnrichmentSchema.safeParse({ ...valid, examples: ['a', 'b'] }).success).toBe(false)
  })
  it('rechaza campos ausentes', () => {
    const { ipa: _ipa, ...rest } = valid
    void _ipa
    expect(vocabEnrichmentSchema.safeParse(rest).success).toBe(false)
  })
  it('rechaza strings vacías', () => {
    expect(vocabEnrichmentSchema.safeParse({ ...valid, translation: '' }).success).toBe(false)
  })
})

describe('parseVocabEnrichment', () => {
  it('devuelve el objeto tipado', () => {
    expect(parseVocabEnrichment(valid).partOfSpeech).toBe('phrasal verb')
  })
  it('lanza con contenido inválido', () => {
    expect(() => parseVocabEnrichment({ foo: 1 })).toThrow()
  })
})
```

- [ ] **Step 2: Ejecutar el test para verlo fallar**

Run: `npm test -- src/lib/validation/vocab.test.ts`
Expected: FAIL ("Cannot find module './vocab'").

- [ ] **Step 3: Implementar `src/lib/validation/vocab.ts`**

```ts
import { z } from 'zod'

export const vocabEnrichmentSchema = z.object({
  translation: z.string().min(1),
  meaning: z.string().min(1),
  partOfSpeech: z.string().min(1),
  ipa: z.string().min(1),
  examples: z.array(z.string().min(1)).min(3),
})

export type VocabEnrichment = z.infer<typeof vocabEnrichmentSchema>

export function parseVocabEnrichment(raw: unknown): VocabEnrichment {
  return vocabEnrichmentSchema.parse(raw)
}
```

- [ ] **Step 4: Ejecutar los tests**

Run: `npm test -- src/lib/validation/vocab.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/validation/vocab.ts src/lib/validation/vocab.test.ts
git commit -m "feat(vocabulario): schema Zod del enriquecimiento de palabras" \
  -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>" \
  -m "Claude-Session: https://claude.ai/code/session_01FzeTNzF6Lprnnn7kSTAvTu"
```

---

## Task 4: Módulo IA `enrichVocab`

**Files:**
- Modify: `src/lib/ai/prompts.ts` (añadir `vocabPrompt`)
- Create: `src/lib/ai/vocab.ts`
- Modify: `src/lib/ai/index.ts` (re-export)
- Test: `src/lib/ai/vocab.test.ts`

**Interfaces:**
- Consumes: `parseVocabEnrichment`, `VocabEnrichment` (Task 3); `openai()` de `./client`; `MODELS` de `./config`; `withRetry`, `AiError` de `./retry`.
- Produces:
  - `vocabPrompt(word: string): { system: string; user: string }`
  - `enrichVocab(word: string): Promise<VocabEnrichment>` — reintenta una vez; envuelve el fallo final en `AiError` con `label: 'enrichVocab'`.

- [ ] **Step 1: Escribir el test que falla**

```ts
// src/lib/ai/vocab.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const create = vi.fn()
vi.mock('./client', () => ({
  openai: () => ({ chat: { completions: { create } } }),
}))

import { enrichVocab } from './vocab'

beforeEach(() => create.mockReset())

const valid = {
  translation: 'despegar',
  meaning: 'to leave the ground',
  partOfSpeech: 'phrasal verb',
  ipa: '/teɪk ɒf/',
  examples: ['The plane took off.', 'We took off early.', 'It took off fast.'],
}

describe('enrichVocab', () => {
  it('parsea y valida la respuesta del modelo', async () => {
    create.mockResolvedValue({ choices: [{ message: { content: JSON.stringify(valid) } }] })
    const r = await enrichVocab('take off')
    expect(r.partOfSpeech).toBe('phrasal verb')
    expect(r.examples).toHaveLength(3)
  })

  it('lanza AiError si falta content (tras el reintento)', async () => {
    create.mockResolvedValue({ choices: [{ message: {} }] })
    await expect(enrichVocab('take off')).rejects.toMatchObject({
      name: 'AiError',
      label: 'enrichVocab',
    })
    expect(create).toHaveBeenCalledTimes(2)
  })

  it('lanza AiError si el JSON no cumple el schema', async () => {
    create.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ ...valid, examples: ['one', 'two'] }) } }],
    })
    await expect(enrichVocab('take off')).rejects.toMatchObject({ name: 'AiError' })
    expect(create).toHaveBeenCalledTimes(2)
  })
})
```

- [ ] **Step 2: Ejecutar el test para verlo fallar**

Run: `npm test -- src/lib/ai/vocab.test.ts`
Expected: FAIL ("Cannot find module './vocab'").

- [ ] **Step 3: Añadir `vocabPrompt` a `src/lib/ai/prompts.ts`**

Añadir al final del fichero:

```ts
export function vocabPrompt(word: string): { system: string; user: string } {
  return {
    system:
      'Eres un diccionario para un estudiante hispanohablante de inglés. ' +
      'Responde SOLO con JSON válido con esta forma exacta: ' +
      '{ "translation": string, "meaning": string, "partOfSpeech": string, "ipa": string, "examples": string[] }. ' +
      'translation: la traducción al español. ' +
      'meaning: la definición en inglés. ' +
      'partOfSpeech: la categoría gramatical en inglés (noun, verb, adjective, adverb, phrase, phrasal verb, idiom...). ' +
      'ipa: la transcripción fonética entre barras, p. ej. /ˈwɜːrd/. ' +
      'examples: al menos 3 frases de ejemplo en inglés que usen la palabra o expresión.',
    user: `Palabra o expresión: "${word}"`,
  }
}
```

- [ ] **Step 4: Implementar `src/lib/ai/vocab.ts`**

```ts
import { openai } from './client'
import { MODELS } from './config'
import { withRetry, AiError } from './retry'
import { vocabPrompt } from './prompts'
import { parseVocabEnrichment, type VocabEnrichment } from '@/lib/validation/vocab'

export async function enrichVocab(word: string): Promise<VocabEnrichment> {
  const { system, user } = vocabPrompt(word)
  return withRetry(async () => {
    const res = await openai().chat.completions.create({
      model: MODELS.chat,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    })
    const raw = res.choices[0]?.message?.content
    if (!raw) throw new AiError('enrichVocab')
    return parseVocabEnrichment(JSON.parse(raw))
  }, 'enrichVocab')
}
```

- [ ] **Step 5: Re-exportar en `src/lib/ai/index.ts`**

Añadir la línea:

```ts
export { enrichVocab } from './vocab'
```

- [ ] **Step 6: Ejecutar los tests**

Run: `npm test -- src/lib/ai/vocab.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 7: Ejecutar toda la suite y el typecheck**

Run: `npm test && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/lib/ai/prompts.ts src/lib/ai/vocab.ts src/lib/ai/vocab.test.ts src/lib/ai/index.ts
git commit -m "feat(vocabulario): enrichVocab con prompt y validación" \
  -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>" \
  -m "Claude-Session: https://claude.ai/code/session_01FzeTNzF6Lprnnn7kSTAvTu"
```

---

## Task 5: Rutas API de vocabulario

**Files:**
- Create: `src/app/api/vocab/route.ts`
- Create: `src/app/api/vocab/[id]/route.ts`
- Create: `src/app/api/vocab/[id]/regenerate/route.ts`

**Interfaces:**
- Consumes: `prisma` de `@/lib/db`; `isAiEnabled` de `@/lib/ai/config`; `enrichVocab`, `AiError` de `@/lib/ai`; `normalizeWord`, `serializeExamples`, `toVocabDTO` de `@/lib/vocab/entry`.
- Produces (contratos HTTP que consume Task 6):
  - `GET /api/vocab?q=&status=` → `200 { entries: VocabEntryDTO[] }` (orden `createdAt` desc).
  - `POST /api/vocab` body `{ word: string }` → `201 { entry: VocabEntryDTO }` · `400` vacía · `409` duplicada · `503` IA off · `502` fallo IA.
  - `PATCH /api/vocab/:id` body `{ status: 'IN_PROGRESS' | 'LEARNED' }` → `200 { entry }` · `400` estado inválido · `404`.
  - `POST /api/vocab/:id/regenerate` → `200 { entry }` · `404` · `503` · `502`.
  - `DELETE /api/vocab/:id` → `200 { ok: true }` · `404`.

No hay tests automáticos para rutas (convención del repo). La verificación es `npm run build` + typecheck + prueba manual con `curl`.

- [ ] **Step 1: Crear `src/app/api/vocab/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { isAiEnabled } from '@/lib/ai/config'
import { enrichVocab, AiError } from '@/lib/ai'
import { normalizeWord, serializeExamples, toVocabDTO } from '@/lib/vocab/entry'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const q = url.searchParams.get('q')?.trim().toLowerCase() ?? ''
  const status = url.searchParams.get('status') ?? ''

  const where: {
    status?: 'IN_PROGRESS' | 'LEARNED'
    OR?: { word?: { contains: string }; translation?: { contains: string } }[]
  } = {}
  if (q) where.OR = [{ word: { contains: q } }, { translation: { contains: q } }]
  if (status === 'IN_PROGRESS' || status === 'LEARNED') where.status = status

  const entries = await prisma.vocabEntry.findMany({ where, orderBy: { createdAt: 'desc' } })
  return NextResponse.json({ entries: entries.map(toVocabDTO) })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const rawWord = typeof body?.word === 'string' ? body.word : ''

  let word: string
  try {
    word = normalizeWord(rawWord)
  } catch {
    return NextResponse.json({ error: 'Escribe una palabra o expresión' }, { status: 400 })
  }

  const existing = await prisma.vocabEntry.findUnique({ where: { word } })
  if (existing) {
    return NextResponse.json({ error: 'Esa palabra ya está en tu lista' }, { status: 409 })
  }

  if (!isAiEnabled()) {
    return NextResponse.json(
      { error: 'La IA está desactivada (falta OPENAI_API_KEY)' },
      { status: 503 },
    )
  }

  let enrichment
  try {
    enrichment = await enrichVocab(rawWord.trim())
  } catch (err) {
    if (err instanceof AiError) {
      return NextResponse.json(
        { error: 'No se pudo generar la ficha, inténtalo de nuevo' },
        { status: 502 },
      )
    }
    throw err
  }

  const entry = await prisma.vocabEntry.create({
    data: {
      word,
      displayWord: rawWord.trim(),
      translation: enrichment.translation,
      meaning: enrichment.meaning,
      partOfSpeech: enrichment.partOfSpeech,
      ipa: enrichment.ipa,
      examples: serializeExamples(enrichment.examples),
    },
  })
  return NextResponse.json({ entry: toVocabDTO(entry) }, { status: 201 })
}
```

- [ ] **Step 2: Crear `src/app/api/vocab/[id]/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { toVocabDTO } from '@/lib/vocab/entry'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json().catch(() => null)
  const status = body?.status
  if (status !== 'IN_PROGRESS' && status !== 'LEARNED') {
    return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })
  }
  const existing = await prisma.vocabEntry.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Palabra no encontrada' }, { status: 404 })

  const entry = await prisma.vocabEntry.update({ where: { id }, data: { status } })
  return NextResponse.json({ entry: toVocabDTO(entry) })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const existing = await prisma.vocabEntry.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Palabra no encontrada' }, { status: 404 })

  await prisma.vocabEntry.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 3: Crear `src/app/api/vocab/[id]/regenerate/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { isAiEnabled } from '@/lib/ai/config'
import { enrichVocab, AiError } from '@/lib/ai'
import { serializeExamples, toVocabDTO } from '@/lib/vocab/entry'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const existing = await prisma.vocabEntry.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Palabra no encontrada' }, { status: 404 })

  if (!isAiEnabled()) {
    return NextResponse.json(
      { error: 'La IA está desactivada (falta OPENAI_API_KEY)' },
      { status: 503 },
    )
  }

  let enrichment
  try {
    enrichment = await enrichVocab(existing.displayWord)
  } catch (err) {
    if (err instanceof AiError) {
      return NextResponse.json(
        { error: 'No se pudo regenerar la ficha, inténtalo de nuevo' },
        { status: 502 },
      )
    }
    throw err
  }

  const entry = await prisma.vocabEntry.update({
    where: { id },
    data: {
      translation: enrichment.translation,
      meaning: enrichment.meaning,
      partOfSpeech: enrichment.partOfSpeech,
      ipa: enrichment.ipa,
      examples: serializeExamples(enrichment.examples),
    },
  })
  return NextResponse.json({ entry: toVocabDTO(entry) })
}
```

- [ ] **Step 4: Typecheck + lint + build**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: PASS.

- [ ] **Step 5: Prueba manual rápida**

En una terminal: `npm run dev`. En otra:

```bash
curl -s -X POST localhost:3000/api/vocab -H 'Content-Type: application/json' -d '{"word":"  Take Off "}' | head -c 400
curl -s localhost:3000/api/vocab | head -c 400
curl -s -X POST localhost:3000/api/vocab -H 'Content-Type: application/json' -d '{"word":"take off"}'   # espera 409
```

Expected: primera llamada `201` con la ficha (o `503` si no hay `OPENAI_API_KEY` — válido); la tercera `409`.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/vocab
git commit -m "feat(vocabulario): rutas API crear/listar/estado/regenerar/borrar" \
  -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>" \
  -m "Claude-Session: https://claude.ai/code/session_01FzeTNzF6Lprnnn7kSTAvTu"
```

---

## Task 6: UI de vocabulario

**Files:**
- Create: `src/components/vocab/SpeakButton.tsx`
- Create: `src/components/vocab/VocabTable.tsx`
- Create: `src/app/vocab/page.tsx`
- Modify: `src/components/Sidebar.tsx`

**Interfaces:**
- Consumes: rutas de Task 5; `VocabEntryDTO`, `toVocabDTO` de `@/lib/vocab/entry`; `Card`, `Button`, `Spinner`; `errorFrom` de `@/lib/http`; `prisma` de `@/lib/db`.
- Produces: ruta `/vocab` navegable desde la barra lateral.

Sin tests automáticos (componentes React). Verificación: `npm run build` + prueba manual.

- [ ] **Step 1: Crear `src/components/vocab/SpeakButton.tsx`**

```tsx
'use client'
import { useEffect, useState } from 'react'

export function SpeakButton({ text }: { text: string }) {
  const [supported, setSupported] = useState(false)
  useEffect(() => {
    setSupported(typeof window !== 'undefined' && 'speechSynthesis' in window)
  }, [])

  function speak() {
    if (!supported) return
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'en-US'
    const voice = window.speechSynthesis.getVoices().find((v) => v.lang.startsWith('en'))
    if (voice) u.voice = voice
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(u)
  }

  return (
    <button
      type="button"
      onClick={speak}
      disabled={!supported}
      aria-label="Escuchar pronunciación"
      title={supported ? 'Escuchar pronunciación' : 'Tu navegador no soporta síntesis de voz'}
      className="disabled:opacity-40"
      style={{ color: 'var(--primary)' }}
    >
      🔊
    </button>
  )
}
```

- [ ] **Step 2: Crear `src/components/vocab/VocabTable.tsx`**

```tsx
'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { errorFrom } from '@/lib/http'
import { SpeakButton } from './SpeakButton'
import type { VocabEntryDTO } from '@/lib/vocab/entry'

type StatusFilter = '' | 'IN_PROGRESS' | 'LEARNED'
const inputStyle = { borderColor: 'var(--border)', background: 'var(--bg)' }

export function VocabTable({ initial }: { initial: VocabEntryDTO[] }) {
  const [entries, setEntries] = useState<VocabEntryDTO[]>(initial)
  const [word, setWord] = useState('')
  const [adding, setAdding] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<StatusFilter>('')
  const [rowBusy, setRowBusy] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  const refresh = useCallback(async (nextQ: string, nextStatus: StatusFilter) => {
    const params = new URLSearchParams()
    if (nextQ.trim()) params.set('q', nextQ.trim())
    if (nextStatus) params.set('status', nextStatus)
    const res = await fetch(`/api/vocab?${params.toString()}`)
    if (res.ok) setEntries((await res.json()).entries)
  }, [])

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current)
    debounce.current = setTimeout(() => refresh(q, status), 300)
    return () => {
      if (debounce.current) clearTimeout(debounce.current)
    }
  }, [q, status, refresh])

  async function add(e: React.FormEvent) {
    e.preventDefault()
    if (!word.trim() || adding) return
    setAdding(true)
    setMessage(null)
    const res = await fetch('/api/vocab', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word }),
    })
    if (res.ok) {
      setWord('')
      await refresh(q, status)
    } else {
      setMessage(await errorFrom(res))
    }
    setAdding(false)
  }

  async function act(id: string, run: () => Promise<Response>) {
    setRowBusy(id)
    setMessage(null)
    const res = await run()
    if (res.ok) {
      setConfirmDelete(null)
      await refresh(q, status)
    } else {
      setMessage(await errorFrom(res))
    }
    setRowBusy(null)
  }

  return (
    <div className="space-y-4">
      <Card>
        <form onSubmit={add} className="flex flex-wrap items-center gap-2">
          <input
            value={word}
            onChange={(e) => setWord(e.target.value)}
            placeholder="Palabra o expresión en inglés"
            className="flex-1 rounded-lg border px-3 py-2 text-sm"
            style={inputStyle}
          />
          <Button type="submit" disabled={adding || !word.trim()}>
            Añadir
          </Button>
          {adding && <Spinner label="Generando ficha…" />}
        </form>
        {message && (
          <p className="mt-2 text-sm" style={{ color: 'var(--warning)' }}>
            {message}
          </p>
        )}
      </Card>

      <div className="flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por palabra o traducción…"
          className="rounded-lg border px-3 py-2 text-sm"
          style={inputStyle}
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as StatusFilter)}
          className="rounded-lg border px-3 py-2 text-sm"
          style={inputStyle}
        >
          <option value="">Todas</option>
          <option value="IN_PROGRESS">En progreso</option>
          <option value="LEARNED">Aprendidas</option>
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-sm">
          <thead>
            <tr style={{ color: 'var(--muted)' }}>
              <th className="p-2 text-left">Palabra</th>
              <th className="p-2 text-left">Traducción</th>
              <th className="p-2 text-left">Tipo</th>
              <th className="p-2 text-left">Significado</th>
              <th className="p-2 text-left">IPA</th>
              <th className="p-2 text-left">🔊</th>
              <th className="p-2 text-left">Ejemplos</th>
              <th className="p-2 text-left">Estado</th>
              <th className="p-2 text-left">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr
                key={entry.id}
                className="border-t align-top"
                style={{ borderColor: 'var(--border)' }}
              >
                <td className="p-2 font-medium">{entry.displayWord}</td>
                <td className="p-2">{entry.translation}</td>
                <td className="p-2" style={{ color: 'var(--muted)' }}>
                  {entry.partOfSpeech}
                </td>
                <td className="p-2">{entry.meaning}</td>
                <td className="p-2">{entry.ipa}</td>
                <td className="p-2">
                  <SpeakButton text={entry.displayWord} />
                </td>
                <td className="p-2">
                  <ul className="list-disc pl-4">
                    {entry.examples.map((ex, i) => (
                      <li key={i}>{ex}</li>
                    ))}
                  </ul>
                </td>
                <td className="p-2">
                  <button
                    type="button"
                    disabled={rowBusy === entry.id}
                    onClick={() =>
                      act(entry.id, () =>
                        fetch(`/api/vocab/${entry.id}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            status: entry.status === 'LEARNED' ? 'IN_PROGRESS' : 'LEARNED',
                          }),
                        }),
                      )
                    }
                    className="rounded-full px-2 py-1 text-xs"
                    style={{
                      background: entry.status === 'LEARNED' ? 'var(--success)' : 'var(--bg)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    {entry.status === 'LEARNED' ? 'Aprendida' : 'En progreso'}
                  </button>
                </td>
                <td className="p-2">
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      disabled={rowBusy === entry.id}
                      onClick={() =>
                        act(entry.id, () =>
                          fetch(`/api/vocab/${entry.id}/regenerate`, { method: 'POST' }),
                        )
                      }
                    >
                      Regenerar
                    </Button>
                    {confirmDelete === entry.id ? (
                      <>
                        <Button
                          variant="ghost"
                          disabled={rowBusy === entry.id}
                          onClick={() =>
                            act(entry.id, () =>
                              fetch(`/api/vocab/${entry.id}`, { method: 'DELETE' }),
                            )
                          }
                        >
                          ¿Seguro?
                        </Button>
                        <Button variant="ghost" onClick={() => setConfirmDelete(null)}>
                          Cancelar
                        </Button>
                      </>
                    ) : (
                      <Button variant="ghost" onClick={() => setConfirmDelete(entry.id)}>
                        Borrar
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={9} className="p-4" style={{ color: 'var(--muted)' }}>
                  Sin palabras todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Crear `src/app/vocab/page.tsx`**

```tsx
import { prisma } from '@/lib/db'
import { toVocabDTO } from '@/lib/vocab/entry'
import { VocabTable } from '@/components/vocab/VocabTable'

export const dynamic = 'force-dynamic'

export default async function VocabPage() {
  const rows = await prisma.vocabEntry.findMany({ orderBy: { createdAt: 'desc' } })
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Vocabulario</h1>
      <VocabTable initial={rows.map(toVocabDTO)} />
    </div>
  )
}
```

- [ ] **Step 4: Añadir el enlace en `src/components/Sidebar.tsx`**

En el array `LINKS`, insertar tras la entrada de `/learn`:

```ts
  { href: '/vocab', label: 'Vocabulario' },
```

Resultado:

```ts
const LINKS = [
  { href: '/', label: 'Inicio' },
  { href: '/learn', label: 'Aprender' },
  { href: '/vocab', label: 'Vocabulario' },
  { href: '/speaking', label: 'Practicar speaking' },
  { href: '/library', label: 'Biblioteca' },
  { href: '/progress', label: 'Progreso' },
]
```

- [ ] **Step 5: Typecheck + lint + build**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: PASS.

- [ ] **Step 6: Prueba manual**

`npm run dev` → abrir `http://localhost:3000/vocab`. Verificar: la pestaña aparece en la barra lateral; añadir una palabra crea una fila (o muestra el aviso de IA desactivada); el botón 🔊 suena; buscador y filtro funcionan; el toggle de estado persiste al recargar; "Borrar" pide confirmación inline sin diálogo del navegador.

- [ ] **Step 7: Commit**

```bash
git add src/components/vocab src/app/vocab src/components/Sidebar.tsx
git commit -m "feat(vocabulario): pestaña con tabla, alta por IA y pronunciación" \
  -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>" \
  -m "Claude-Session: https://claude.ai/code/session_01FzeTNzF6Lprnnn7kSTAvTu"
```

---

## Task 7: `sliceUnitPages` + campo `page` en la validación de ejercicios

**Files:**
- Modify: `src/lib/pdf.ts`
- Modify: `src/lib/pdf.test.ts`
- Modify: `src/lib/validation/exercises.ts`
- Modify: `src/lib/validation/exercises.test.ts`

**Interfaces:**
- Produces:
  - `type PageSlice = { page: number; text: string }` (exportado desde `src/lib/pdf.ts`).
  - `sliceUnitPages(pages: string[], startPage: number, endPage: number): PageSlice[]` — número de página **absoluto** (`startPage + i`), omite páginas vacías, clampa `endPage` a `pages.length`, lanza si `startPage < 1` o `startPage > endPage`.
  - `multipleChoiceSchema` y `fillBlanksSchema`: cada item admite `page?: number` (entero positivo). Los tipos inferidos `MultipleChoiceContent` / `FillBlanksContent` ganan `page?: number` en sus items.

- [ ] **Step 1: Escribir los tests que fallan — `src/lib/pdf.test.ts`**

Añadir el import y el bloque describe:

```ts
import { extractPdf, sliceUnitText, sliceUnitPages } from './pdf'
```

```ts
describe('sliceUnitPages', () => {
  const pages = ['uno', 'dos', '', 'cuatro']
  it('numera las páginas de forma absoluta y omite las vacías', () => {
    expect(sliceUnitPages(pages, 2, 4)).toEqual([
      { page: 2, text: 'dos' },
      { page: 4, text: 'cuatro' },
    ])
  })
  it('clampa endPage al total', () => {
    expect(sliceUnitPages(pages, 4, 99)).toEqual([{ page: 4, text: 'cuatro' }])
  })
  it('lanza si startPage > endPage', () => {
    expect(() => sliceUnitPages(pages, 3, 2)).toThrow()
  })
  it('lanza si startPage < 1', () => {
    expect(() => sliceUnitPages(pages, 0, 2)).toThrow()
  })
})
```

- [ ] **Step 2: Escribir los tests que fallan — `src/lib/validation/exercises.test.ts`**

Añadir dentro de `describe('exerciseSchemaFor', ...)`:

```ts
  it('acepta opción múltiple con referencia de página', () => {
    const ok = {
      items: [{ question: 'q', options: ['a', 'b'], correctIndex: 0, explanation: 'e', page: 12 }],
    }
    expect(exerciseSchemaFor('MULTIPLE_CHOICE').safeParse(ok).success).toBe(true)
  })
  it('rechaza page no positiva en opción múltiple', () => {
    const bad = {
      items: [{ question: 'q', options: ['a', 'b'], correctIndex: 0, explanation: 'e', page: 0 }],
    }
    expect(exerciseSchemaFor('MULTIPLE_CHOICE').safeParse(bad).success).toBe(false)
  })
  it('acepta rellenar huecos con y sin page', () => {
    const ok = {
      items: [
        { sentence: 'He ___ home.', answer: 'went', acceptedVariants: [], page: 5 },
        { sentence: 'She ___ it.', answer: 'did', acceptedVariants: [] },
      ],
    }
    expect(exerciseSchemaFor('FILL_BLANKS').safeParse(ok).success).toBe(true)
  })
```

- [ ] **Step 3: Ejecutar los tests para verlos fallar**

Run: `npm test -- src/lib/pdf.test.ts src/lib/validation/exercises.test.ts`
Expected: FAIL (`sliceUnitPages` no existe; el test de `page: 0` pasa el schema actual porque el campo se ignora → `safeParse` devuelve `success: true`, y el test espera `false`).

- [ ] **Step 4: Implementar `sliceUnitPages` en `src/lib/pdf.ts`**

Añadir al final:

```ts
export type PageSlice = { page: number; text: string }

export function sliceUnitPages(
  pages: string[],
  startPage: number,
  endPage: number,
): PageSlice[] {
  if (startPage < 1 || startPage > endPage) {
    throw new Error('rango de páginas inválido')
  }
  const to = Math.min(endPage, pages.length)
  const out: PageSlice[] = []
  for (let p = startPage; p <= to; p++) {
    const text = pages[p - 1]?.trim()
    if (text) out.push({ page: p, text })
  }
  return out
}
```

- [ ] **Step 5: Añadir `page` a los schemas en `src/lib/validation/exercises.ts`**

En `multipleChoiceSchema`, dentro del `z.object({ ... })` de cada item (antes del `.refine`), añadir:

```ts
          page: z.number().int().positive().optional(),
```

En `fillBlanksSchema`, dentro del `z.object({ ... })` de cada item, añadir:

```ts
        page: z.number().int().positive().optional(),
```

- [ ] **Step 6: Ejecutar los tests**

Run: `npm test -- src/lib/pdf.test.ts src/lib/validation/exercises.test.ts`
Expected: PASS.

- [ ] **Step 7: Suite completa + typecheck**

Run: `npm test && npx tsc --noEmit`
Expected: PASS (los fixtures existentes sin `page` siguen validando porque el campo es opcional).

- [ ] **Step 8: Commit**

```bash
git add src/lib/pdf.ts src/lib/pdf.test.ts src/lib/validation/exercises.ts src/lib/validation/exercises.test.ts
git commit -m "feat(ejercicios): sliceUnitPages y campo page opcional en la validación" \
  -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>" \
  -m "Claude-Session: https://claude.ai/code/session_01FzeTNzF6Lprnnn7kSTAvTu"
```

---

## Task 8: Prompt y generación de ejercicios conscientes de páginas

**Files:**
- Modify: `src/lib/ai/prompts.ts`
- Modify: `src/lib/ai/exercises.ts`
- Modify: `src/lib/ai/exercises.test.ts`
- Modify: `src/app/api/units/[id]/exercises/route.ts`

**Interfaces:**
- Consumes: `PageSlice` de `@/lib/pdf` (Task 7).
- Produces:
  - `exercisePrompt(unitText: string, type: ExerciseType, pages?: PageSlice[])` — si `pages` no está vacío y `type` es `MULTIPLE_CHOICE` o `FILL_BLANKS`, monta el texto con cabeceras `=== Página N ===` e instruye añadir `page` solo para preguntas apoyadas en un pasaje concreto. Resto de tipos: comportamiento actual.
  - `generateExercises(unitText: string, type: ExerciseType, opts?: { pages?: PageSlice[] })` — pasa `opts?.pages` a `exercisePrompt`.
  - Ruta `POST /api/units/[id]/exercises`: para `MULTIPLE_CHOICE`/`FILL_BLANKS` reconstruye páginas desde `unit.book.rawText` y las pasa a `generateExercises`.

- [ ] **Step 1: Escribir los tests que fallan — `src/lib/ai/exercises.test.ts`**

Añadir el import y el bloque:

```ts
import { exercisePrompt } from './prompts'
```

```ts
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
```

- [ ] **Step 2: Ejecutar para verlo fallar**

Run: `npm test -- src/lib/ai/exercises.test.ts`
Expected: FAIL (`exercisePrompt` con 3 args no compila / no añade marcadores).

- [ ] **Step 3: Actualizar `src/lib/ai/prompts.ts`**

Sustituir el bloque `SHAPE` y `exercisePrompt` por:

```ts
import type { PageSlice } from '@/lib/pdf'

const SHAPE: Record<ExerciseType, string> = {
  MULTIPLE_CHOICE:
    '{ "items": [{ "question": string, "options": string[4], "correctIndex": number (0-3), "explanation": string, "page"?: number }] }',
  FILL_BLANKS:
    '{ "items": [{ "sentence": string con "___" para el hueco, "answer": string, "acceptedVariants": string[], "page"?: number }] }',
  MATCHING: '{ "items": [{ "left": string (término inglés), "right": string (definición o traducción) }] }',
  ORDER_WORDS:
    '{ "items": [{ "scrambled": string[] (palabras desordenadas), "correctOrder": string[] (mismas palabras ordenadas) }] }',
  FLASHCARDS: '{ "items": [{ "front": string (inglés), "back": string (español) }] }',
}

const PAGE_AWARE: Partial<Record<ExerciseType, true>> = {
  MULTIPLE_CHOICE: true,
  FILL_BLANKS: true,
}

export function exercisePrompt(
  unitText: string,
  type: ExerciseType,
  pages?: PageSlice[],
): { system: string; user: string } {
  const usePages = Boolean(pages && pages.length > 0 && PAGE_AWARE[type])
  const textBlock = usePages
    ? pages!.map((p) => `=== Página ${p.page} ===\n${p.text}`).join('\n\n').slice(0, 8000)
    : unitText.slice(0, 8000)
  const pageHint = usePages
    ? 'Si una pregunta se apoya en un pasaje concreto, añade "page" con el número de la página mostrada sobre ese pasaje. Si la pregunta es general, omite "page".\n\n'
    : ''
  return {
    system:
      'Eres un profesor de inglés que crea ejercicios a partir del texto de una unidad de un libro. ' +
      'Responde SOLO con JSON válido que cumpla exactamente la forma indicada. El contenido de los ejercicios está en inglés; las traducciones y definiciones en español.',
    user:
      `Crea ${COUNTS[type]} ítems de tipo ${type}.\n` +
      `Forma JSON exacta: ${SHAPE[type]}\n\n` +
      pageHint +
      `Texto de la unidad:\n"""\n${textBlock}\n"""`,
  }
}
```

(El `COUNTS` y el resto del fichero no cambian.)

- [ ] **Step 4: Actualizar `src/lib/ai/exercises.ts`**

```ts
import type { ExerciseType } from '@prisma/client'
import { openai } from './client'
import { MODELS } from './config'
import { withRetry, AiError } from './retry'
import { exercisePrompt } from './prompts'
import type { PageSlice } from '@/lib/pdf'
import { parseExerciseContent, type ExerciseContent } from '@/lib/validation/exercises'

export async function generateExercises(
  unitText: string,
  type: ExerciseType,
  opts?: { pages?: PageSlice[] },
): Promise<ExerciseContent> {
  const { system, user } = exercisePrompt(unitText, type, opts?.pages)
  return withRetry(async () => {
    const res = await openai().chat.completions.create({
      model: MODELS.chat,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    })
    const raw = res.choices[0]?.message?.content
    if (!raw) throw new AiError('generateExercises')
    return parseExerciseContent(type, JSON.parse(raw))
  }, 'generateExercises')
}
```

- [ ] **Step 5: Actualizar `src/app/api/units/[id]/exercises/route.ts`**

Añadir el import:

```ts
import { sliceUnitPages } from '@/lib/pdf'
```

Cambiar la carga de la unidad para incluir el libro:

```ts
  const unit = await prisma.unit.findUnique({ where: { id }, include: { book: true } })
```

Sustituir la línea de generación (dentro del `try`):

```ts
    const usePages = type === 'MULTIPLE_CHOICE' || type === 'FILL_BLANKS'
    const pages = usePages
      ? sliceUnitPages(JSON.parse(unit.book.rawText) as string[], unit.startPage, unit.endPage)
      : undefined
    const content = await generateExercises(unit.extractedText, type, { pages })
    serialized = serializeContent(type, content)
```

- [ ] **Step 6: Ejecutar los tests + typecheck**

Run: `npm test && npx tsc --noEmit`
Expected: PASS (incluye el test existente "parsea y valida la respuesta del modelo" y "lanza AiError…", que no pasan `pages` y deben seguir verdes).

- [ ] **Step 7: Lint + build**

Run: `npm run lint && npm run build`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/lib/ai/prompts.ts src/lib/ai/exercises.ts src/lib/ai/exercises.test.ts "src/app/api/units/[id]/exercises/route.ts"
git commit -m "feat(ejercicios): prompt consciente de páginas para MCQ y rellenar huecos" \
  -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>" \
  -m "Claude-Session: https://claude.ai/code/session_01FzeTNzF6Lprnnn7kSTAvTu"
```

---

## Task 9: Mostrar "(pág. N)" en la UI de ejercicios

**Files:**
- Modify: `src/components/exercises/MultipleChoice.tsx`
- Modify: `src/components/exercises/FillBlanks.tsx`

**Interfaces:**
- Consumes: `q.page` / `it.page` (opcional) de los tipos `MultipleChoiceContent` / `FillBlanksContent` (Task 7).

Sin tests automáticos (componentes React). Verificación: `npm run build` + prueba manual regenerando un ejercicio.

- [ ] **Step 1: `src/components/exercises/MultipleChoice.tsx`**

Sustituir la línea del enunciado:

```tsx
          <p className="font-medium">{i + 1}. {q.question}</p>
```

por:

```tsx
          <p className="font-medium">
            {i + 1}. {q.question}
            {q.page ? (
              <span className="ml-2 text-xs font-normal" style={{ color: 'var(--muted)' }}>
                (pág. {q.page})
              </span>
            ) : null}
          </p>
```

- [ ] **Step 2: `src/components/exercises/FillBlanks.tsx`**

Tras `{after}` (y antes del bloque `{done && !ok && ...}`), añadir:

```tsx
            {it.page ? (
              <span className="ml-2 text-xs" style={{ color: 'var(--muted)' }}>
                (pág. {it.page})
              </span>
            ) : null}
```

- [ ] **Step 3: Typecheck + lint + build**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: PASS.

- [ ] **Step 4: Prueba manual**

`npm run dev` → abrir una unidad en `/learn/<unitId>`, pestaña "Opción múltiple", pulsar "Regenerar". Con `OPENAI_API_KEY` presente, algunas preguntas basadas en un pasaje muestran "(pág. N)"; las generales, no. Repetir en "Rellenar huecos". Verificar que "Relacionar", "Ordenar frases" y "Flashcards" siguen igual.

- [ ] **Step 5: Commit**

```bash
git add src/components/exercises/MultipleChoice.tsx src/components/exercises/FillBlanks.tsx
git commit -m "feat(ejercicios): mostrar la página de referencia en MCQ y rellenar huecos" \
  -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>" \
  -m "Claude-Session: https://claude.ai/code/session_01FzeTNzF6Lprnnn7kSTAvTu"
```

---

## Verificación final (tras la última tarea)

- [ ] `npm test` — toda la suite verde.
- [ ] `npm run lint` — sin errores.
- [ ] `npm run build` — build de producción OK.
- [ ] `npx tsc --noEmit` — sin errores de tipos.
- [ ] Revisión manual contra los criterios de aceptación de la spec (sección "Criterios de aceptación").
- [ ] Rama `feat-vocabulario-referencias-pagina` lista para PR contra `dev`.

---

## Autorrevisión del plan (hecha)

- **Cobertura de la spec:** Parte A → Tasks 1–6; Parte B → Tasks 7–9. Cada requisito de la spec (modelo, enriquecimiento IA, no editable salvo estado, regenerar, sin XP, voz de navegador + IPA, buscador/filtro, borrado sin diálogo, páginas solo en MCQ/fill-blanks con número absoluto, contenido cacheado sigue validando) tiene tarea asignada.
- **Placeholders:** ninguno; todo el código va explícito.
- **Consistencia de tipos:** `VocabEntryDTO` (Task 2) se usa igual en Tasks 5 y 6. `PageSlice` se define en Task 7 y se consume en Tasks 8. `enrichVocab`/`AiError`/`serializeExamples`/`toVocabDTO`/`normalizeWord` con firmas idénticas entre definición y uso. Contratos HTTP de Task 5 coinciden con las llamadas `fetch` de Task 6.

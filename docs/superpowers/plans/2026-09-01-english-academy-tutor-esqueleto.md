# English Academy Tutor — Esqueleto — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir el esqueleto funcional de una app web personal de inglés: estudio gamificado a partir de PDFs del usuario (5 tipos de ejercicio con XP/nivel/racha) + práctica de speaking asíncrona (conversación guiada de 5 turnos y monólogo libre de 1 turno).

**Architecture:** Next.js App Router full-stack en local. Toda la lógica de IA (OpenAI: STT, generación/corrección, TTS) vive tras `lib/ai/` para poder mockearla. Contenido generado por IA se cachea en SQLite (Prisma). Lógica pura (XP, nivel, racha, corrección de ejercicios, validación) se desarrolla con TDD y no depende de red ni DB.

**Tech Stack:** Next.js 15 (App Router) + React 19, TypeScript, Tailwind CSS v4, Prisma + SQLite, `unpdf`, `openai` (SDK Node), `zod`, `next-themes`, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-01-english-academy-tutor-esqueleto-design.md`

## Global Constraints

- **Un solo usuario.** Sin autenticación. Un registro único `Profile` para XP/racha.
- **Idioma de la UI: español.** Todo el texto visible en español. El contenido de estudio y las correcciones son sobre/en inglés.
- **IA: solo OpenAI.** Modelos exactos, definidos como constantes en `lib/ai/config.ts`:
  - STT: `gpt-4o-transcribe`
  - Generación y corrección: `gpt-4o`
  - TTS: `gpt-4o-mini-tts`, voz `alloy`
- **Extracción de PDF:** librería `unpdf` (`extractText`, `getDocumentProxy`). Sin binarios nativos.
- **Audio del navegador:** `MediaRecorder` API, formato `audio/webm`.
- **Almacenamiento en disco local**, todo gitignored:
  - PDFs subidos → `./storage/books/`
  - Audio (grabaciones y TTS) → `./storage/audio/`
  - `./prisma/dev.db`
- **Config:** `.env.local` con `OPENAI_API_KEY`. La app arranca sin la clave; las acciones de IA se deshabilitan con aviso. Helper `isAiEnabled()` = `!!process.env.OPENAI_API_KEY`.
- **Límite de subida de PDF: 25 MB.** Rechazar no-PDF. Avisar si el PDF no tiene texto extraíble.
- **Reglas de XP** (en `lib/gamification/xp.ts`):
  - Opción múltiple / rellenar huecos / relacionar / ordenar frases: `10 + 2 * aciertos` por set completado.
  - Flashcards: `5` por sesión completada.
  - Speaking: `20` por turno completado (guiado completo = 100; monólogo = 20).
- **Curva de nivel:** XP acumulado para *estar* en el nivel `L` es `cumXp(L) = 100 * (L-1) * L / 2`. Es decir: nivel 1 = 0 XP, nivel 2 = 100, nivel 3 = 300, nivel 4 = 600, nivel 5 = 1000.
- **Speaking:** guiado = 5 turnos fijos; monólogo = 1 turno, tema escrito por el usuario.
- **TDD:** test primero para toda lógica pura. Llamadas a OpenAI siempre mockeadas en tests. Sin tests e2e ni de UI.
- **Commits frecuentes**, uno por tarea como mínimo. Prefijos: `feat:`, `test:`, `chore:`, `docs:`.

---

## File Structure

**Lógica pura (sin red, sin DB) — núcleo testeado:**
- `src/lib/gamification/level.ts` — `levelFromXp(xp)`.
- `src/lib/gamification/xp.ts` — `xpForExercise(type, correctCount)`, `XP_PER_SPEAKING_TURN`.
- `src/lib/exercises/normalize.ts` — `normalizeAnswer(s)`, `isFillBlankCorrect(...)`.
- `src/lib/exercises/grade.ts` — `gradeMultipleChoice`, `gradeOrderWords`, `gradeMatching`, tipo `GradeResult`.
- `src/lib/validation/exercises.ts` — esquemas zod de los 5 tipos de `ExerciseSet.content`.
- `src/lib/validation/speaking.ts` — esquemas zod de `TurnReview` y del prompt inicial guiado.
- `src/lib/ai/retry.ts` — `withRetry(fn, label)`, clase `AiError`.

**Capa de IA (aislada, mockeable):**
- `src/lib/ai/config.ts` — modelos, `isAiEnabled()`.
- `src/lib/ai/client.ts` — instancia perezosa de `OpenAI`.
- `src/lib/ai/transcribe.ts` — `transcribe(audio: Buffer): Promise<string>`.
- `src/lib/ai/exercises.ts` — `generateExercises(unitText, type): Promise<unknown>` (valida el llamador).
- `src/lib/ai/speaking.ts` — `generateGuidedOpener(topic)`, `reviewSpeakingTurn(params)`.
- `src/lib/ai/tts.ts` — `synthesizeSpeech(text): Promise<Buffer>`.
- `src/lib/ai/index.ts` — re-exporta todo lo anterior (punto único que los tests mockean).

**Datos:**
- `prisma/schema.prisma` — modelos.
- `src/lib/db.ts` — cliente Prisma singleton.
- `src/lib/profile.ts` — `getProfile()` (crea la fila si no existe), `recordActivity({ xp })`.

**Almacenamiento de archivos:**
- `src/lib/storage.ts` — `saveBookFile`, `saveAudioFile`, `readAudioFile`, rutas.

**API (Route Handlers):**
- `src/app/api/books/route.ts` — `POST` subir PDF.
- `src/app/api/units/route.ts` — `POST` crear unidad.
- `src/app/api/units/[id]/exercises/route.ts` — `POST` generar/obtener set (`?type=`).
- `src/app/api/attempts/route.ts` — `POST` registrar intento.
- `src/app/api/speaking/sessions/route.ts` — `POST` crear sesión.
- `src/app/api/speaking/sessions/[id]/turns/route.ts` — `POST` enviar audio de un turno.
- `src/app/api/audio/[...path]/route.ts` — `GET` servir audio.

**UI:**
- `src/app/layout.tsx` — shell: `<ThemeProvider>`, `<Sidebar>`, `<StatsHeader>`.
- `src/components/Sidebar.tsx`, `StatsHeader.tsx`, `ThemeToggle.tsx`, `AiDisabledBanner.tsx`.
- `src/components/ui/` — `Card.tsx`, `Button.tsx`, `Tabs.tsx`, `ProgressBar.tsx`, `ProgressRing.tsx`, `Spinner.tsx`.
- `src/components/exercises/` — `MultipleChoice.tsx`, `FillBlanks.tsx`, `Matching.tsx`, `OrderWords.tsx`, `Flashcards.tsx`, `ExerciseTabs.tsx`.
- `src/components/speaking/` — `AudioRecorder.tsx`, `TurnFeedback.tsx`, `TurnTabs.tsx`, `SessionSummary.tsx`.
- `src/app/page.tsx` — Home.
- `src/app/learn/page.tsx`, `src/app/learn/[unitId]/page.tsx`.
- `src/app/speaking/page.tsx`, `src/app/speaking/[sessionId]/page.tsx`.
- `src/app/library/page.tsx`, `src/app/library/[bookId]/page.tsx`.
- `src/app/progress/page.tsx`.

**Config raíz:** `package.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `.eslintrc`, `.gitignore`, `.env.local.example`, `tailwind`/`globals.css`.

---

## Task 1: Scaffold del proyecto Next.js + Vitest

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `.gitignore`, `.env.local.example`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`
- Create: `src/lib/sanity.ts`, `src/lib/sanity.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces: proyecto que compila; `npm run dev`, `npm run build`, `npm test`, `npm run lint` funcionan. Alias `@/*` → `src/*`.

- [ ] **Step 1: Crear el proyecto con create-next-app**

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-turbopack --use-npm
```

Si pregunta por sobreescribir archivos existentes (`CLAUDE.md`, etc.), NO sobreescribir; solo añadir. Si `create-next-app` se niega por directorio no vacío, generarlo en una carpeta temporal y copiar `package.json`, `tsconfig.json`, `next.config.ts`, `next-env.d.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `src/`, `public/` al repo.

- [ ] **Step 2: Instalar dependencias del proyecto**

```bash
npm install @prisma/client openai zod next-themes unpdf
npm install -D prisma vitest @vitejs/plugin-react vite-tsconfig-paths @types/node
```

- [ ] **Step 3: Crear `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
```

- [ ] **Step 4: Añadir scripts a `package.json`**

Fusionar en `"scripts"`:

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "test": "vitest run",
  "test:watch": "vitest",
  "db:migrate": "prisma migrate dev",
  "db:studio": "prisma studio"
}
```

- [ ] **Step 5: Actualizar `.gitignore`**

Añadir al final:

```
# app data
/prisma/dev.db
/prisma/dev.db-journal
/storage/
.env.local
```

- [ ] **Step 6: Crear `.env.local.example`**

```
OPENAI_API_KEY=sk-...
```

- [ ] **Step 7: Escribir el test de sanidad**

`src/lib/sanity.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { greet } from './sanity'

describe('greet', () => {
  it('devuelve un saludo', () => {
    expect(greet('Ada')).toBe('Hola, Ada')
  })
})
```

- [ ] **Step 8: Ejecutar el test y verlo fallar**

Run: `npm test`
Expected: FAIL — `Cannot find module './sanity'`.

- [ ] **Step 9: Implementación mínima**

`src/lib/sanity.ts`:

```ts
export function greet(name: string): string {
  return `Hola, ${name}`
}
```

- [ ] **Step 10: Ejecutar el test y verlo pasar**

Run: `npm test`
Expected: PASS.

- [ ] **Step 11: Verificar build y lint**

Run: `npm run build && npm run lint`
Expected: ambos terminan sin error.

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js + Vitest"
```

---

## Task 2: Prisma — schema, migración y cliente

**Files:**
- Create: `prisma/schema.prisma`, `src/lib/db.ts`
- Create: `src/lib/db.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `import { prisma } from '@/lib/db'` — `PrismaClient` singleton.
  - Enums Prisma: `ExerciseType` (`MULTIPLE_CHOICE|FILL_BLANKS|MATCHING|ORDER_WORDS|FLASHCARDS`), `SpeakingMode` (`GUIDED|MONOLOGUE`), `SessionStatus` (`IN_PROGRESS|COMPLETED`).
  - Modelos: `Profile, Book, Unit, ExerciseSet, ExerciseAttempt, SpeakingSession, SpeakingTurn`.

- [ ] **Step 1: Inicializar Prisma con SQLite**

```bash
npx prisma init --datasource-provider sqlite
```

Ajustar `.env` generado: `DATABASE_URL="file:./dev.db"`.

- [ ] **Step 2: Escribir `prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

enum ExerciseType {
  MULTIPLE_CHOICE
  FILL_BLANKS
  MATCHING
  ORDER_WORDS
  FLASHCARDS
}

enum SpeakingMode {
  GUIDED
  MONOLOGUE
}

enum SessionStatus {
  IN_PROGRESS
  COMPLETED
}

model Profile {
  id               Int       @id @default(1)
  xp               Int       @default(0)
  currentStreak    Int       @default(0)
  longestStreak    Int       @default(0)
  lastActivityDate DateTime?
}

model Book {
  id        String   @id @default(cuid())
  title     String
  filename  String
  pageCount Int
  rawText   String
  createdAt DateTime @default(now())
  units     Unit[]
}

model Unit {
  id            String        @id @default(cuid())
  bookId        String
  book          Book          @relation(fields: [bookId], references: [id], onDelete: Cascade)
  title         String
  startPage     Int
  endPage       Int
  level         String?
  extractedText String
  createdAt     DateTime      @default(now())
  lastOpenedAt  DateTime?
  exerciseSets  ExerciseSet[]
  sessions      SpeakingSession[]
}

model ExerciseSet {
  id          String           @id @default(cuid())
  unitId      String
  unit        Unit             @relation(fields: [unitId], references: [id], onDelete: Cascade)
  type        ExerciseType
  content     String
  generatedAt DateTime         @default(now())
  attempts    ExerciseAttempt[]

  @@unique([unitId, type])
}

model ExerciseAttempt {
  id            String      @id @default(cuid())
  exerciseSetId String
  exerciseSet   ExerciseSet @relation(fields: [exerciseSetId], references: [id], onDelete: Cascade)
  score         Int
  correctCount  Int
  totalCount    Int
  xpEarned      Int
  answers       String
  completedAt   DateTime    @default(now())
}

model SpeakingSession {
  id         String        @id @default(cuid())
  mode       SpeakingMode
  unitId     String?
  unit       Unit?         @relation(fields: [unitId], references: [id], onDelete: SetNull)
  topic      String
  status     SessionStatus @default(IN_PROGRESS)
  totalTurns Int
  xpEarned   Int           @default(0)
  createdAt  DateTime      @default(now())
  turns      SpeakingTurn[]
}

model SpeakingTurn {
  id                  String          @id @default(cuid())
  sessionId           String
  session             SpeakingSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  index               Int
  assistantPrompt     String
  assistantAudioPath  String?
  userAudioPath       String?
  userTranscript      String?
  correctedText       String?
  naturalVersion      String?
  fluencyTip          String?
  correctionAudioPath String?
  createdAt           DateTime        @default(now())

  @@unique([sessionId, index])
}
```

Nota: `content` y `answers` son JSON serializado como `String` (SQLite no tiene tipo `Json` con Prisma de forma portable; se hace `JSON.stringify`/`JSON.parse` en la capa de app).

- [ ] **Step 3: Crear la migración**

Run: `npx prisma migrate dev --name init`
Expected: crea `prisma/migrations/*/migration.sql` y genera el cliente.

- [ ] **Step 4: Escribir `src/lib/db.ts`**

```ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

- [ ] **Step 5: Escribir el test de integración de DB**

`src/lib/db.test.ts` (usa la misma `dev.db`; limpia lo que crea):

```ts
import { describe, it, expect, afterAll } from 'vitest'
import { prisma } from './db'

describe('prisma client', () => {
  it('crea y borra un Book', async () => {
    const book = await prisma.book.create({
      data: { title: 'T', filename: 'f.pdf', pageCount: 1, rawText: 'x' },
    })
    expect(book.id).toBeTruthy()
    await prisma.book.delete({ where: { id: book.id } })
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })
})
```

- [ ] **Step 6: Ejecutar el test**

Run: `npm test -- src/lib/db.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: prisma schema, migración inicial y cliente"
```

---

## Task 3: Gamificación — `levelFromXp`

**Files:**
- Create: `src/lib/gamification/level.ts`, `src/lib/gamification/level.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `cumXpForLevel(level: number): number`
  - `levelFromXp(xp: number): { level: number; xpIntoLevel: number; xpForNextLevel: number }`
    - `xpForNextLevel` = XP total del tramo del nivel actual (`cumXp(level+1) - cumXp(level)`).
    - `xpIntoLevel` = `xp - cumXp(level)`.

- [ ] **Step 1: Escribir los tests**

`src/lib/gamification/level.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { cumXpForLevel, levelFromXp } from './level'

describe('cumXpForLevel', () => {
  it('sigue la curva 100*(L-1)*L/2', () => {
    expect(cumXpForLevel(1)).toBe(0)
    expect(cumXpForLevel(2)).toBe(100)
    expect(cumXpForLevel(3)).toBe(300)
    expect(cumXpForLevel(4)).toBe(600)
    expect(cumXpForLevel(5)).toBe(1000)
  })
})

describe('levelFromXp', () => {
  it('0 XP => nivel 1', () => {
    expect(levelFromXp(0)).toEqual({ level: 1, xpIntoLevel: 0, xpForNextLevel: 100 })
  })
  it('justo en el umbral sube de nivel', () => {
    expect(levelFromXp(100).level).toBe(2)
    expect(levelFromXp(300).level).toBe(3)
  })
  it('a mitad de tramo', () => {
    const r = levelFromXp(150)
    expect(r.level).toBe(2)
    expect(r.xpIntoLevel).toBe(50)
    expect(r.xpForNextLevel).toBe(200) // cumXp(3)-cumXp(2) = 300-100
  })
  it('XP muy alto no rompe', () => {
    expect(levelFromXp(1_000_000).level).toBeGreaterThan(10)
  })
  it('XP negativo se trata como 0', () => {
    expect(levelFromXp(-5).level).toBe(1)
  })
})
```

- [ ] **Step 2: Ejecutar y ver fallar**

Run: `npm test -- src/lib/gamification/level.test.ts`
Expected: FAIL — módulo no encontrado.

- [ ] **Step 3: Implementar**

`src/lib/gamification/level.ts`:

```ts
export function cumXpForLevel(level: number): number {
  return (100 * (level - 1) * level) / 2
}

export function levelFromXp(xp: number): {
  level: number
  xpIntoLevel: number
  xpForNextLevel: number
} {
  const safeXp = Math.max(0, Math.floor(xp))
  let level = 1
  while (cumXpForLevel(level + 1) <= safeXp) level++
  const base = cumXpForLevel(level)
  return {
    level,
    xpIntoLevel: safeXp - base,
    xpForNextLevel: cumXpForLevel(level + 1) - base,
  }
}
```

- [ ] **Step 4: Ejecutar y ver pasar**

Run: `npm test -- src/lib/gamification/level.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: levelFromXp y curva de nivel"
```

---

## Task 4: Gamificación — reglas de XP

**Files:**
- Create: `src/lib/gamification/xp.ts`, `src/lib/gamification/xp.test.ts`

**Interfaces:**
- Consumes: enum `ExerciseType` de `@prisma/client`.
- Produces:
  - `xpForExercise(type: ExerciseType, correctCount: number): number`
  - `XP_PER_SPEAKING_TURN = 20`

- [ ] **Step 1: Escribir los tests**

`src/lib/gamification/xp.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { xpForExercise, XP_PER_SPEAKING_TURN } from './xp'

describe('xpForExercise', () => {
  it('opción múltiple: 10 base + 2 por acierto', () => {
    expect(xpForExercise('MULTIPLE_CHOICE', 0)).toBe(10)
    expect(xpForExercise('MULTIPLE_CHOICE', 7)).toBe(24)
  })
  it('rellenar, relacionar, ordenar usan la misma fórmula', () => {
    expect(xpForExercise('FILL_BLANKS', 10)).toBe(30)
    expect(xpForExercise('MATCHING', 8)).toBe(26)
    expect(xpForExercise('ORDER_WORDS', 6)).toBe(22)
  })
  it('flashcards: 5 fijos sin importar el conteo', () => {
    expect(xpForExercise('FLASHCARDS', 0)).toBe(5)
    expect(xpForExercise('FLASHCARDS', 15)).toBe(5)
  })
})

describe('XP_PER_SPEAKING_TURN', () => {
  it('es 20', () => {
    expect(XP_PER_SPEAKING_TURN).toBe(20)
  })
})
```

- [ ] **Step 2: Ejecutar y ver fallar**

Run: `npm test -- src/lib/gamification/xp.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar**

`src/lib/gamification/xp.ts`:

```ts
import type { ExerciseType } from '@prisma/client'

export const XP_PER_SPEAKING_TURN = 20

export function xpForExercise(type: ExerciseType, correctCount: number): number {
  if (type === 'FLASHCARDS') return 5
  return 10 + 2 * Math.max(0, correctCount)
}
```

- [ ] **Step 4: Ejecutar y ver pasar**

Run: `npm test -- src/lib/gamification/xp.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: reglas de XP"
```

---

## Task 5: Corrección de ejercicios — normalización de respuestas

**Files:**
- Create: `src/lib/exercises/normalize.ts`, `src/lib/exercises/normalize.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `normalizeAnswer(s: string): string`
  - `isFillBlankCorrect(user: string, answer: string, acceptedVariants: string[]): boolean`

- [ ] **Step 1: Escribir los tests**

`src/lib/exercises/normalize.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { normalizeAnswer, isFillBlankCorrect } from './normalize'

describe('normalizeAnswer', () => {
  it('minúsculas, sin tildes, espacios colapsados, trim', () => {
    expect(normalizeAnswer('  Él   Está ')).toBe('el esta')
    expect(normalizeAnswer('CAFÉ')).toBe('cafe')
  })
})

describe('isFillBlankCorrect', () => {
  it('acepta la respuesta canónica ignorando mayúsculas/tildes', () => {
    expect(isFillBlankCorrect('Went', 'went', [])).toBe(true)
  })
  it('acepta variantes', () => {
    expect(isFillBlankCorrect("didn't", 'did not', ["didn't"])).toBe(true)
  })
  it('rechaza lo incorrecto', () => {
    expect(isFillBlankCorrect('go', 'went', [])).toBe(false)
  })
  it('respuesta vacía es incorrecta', () => {
    expect(isFillBlankCorrect('   ', 'went', [])).toBe(false)
  })
})
```

- [ ] **Step 2: Ejecutar y ver fallar**

Run: `npm test -- src/lib/exercises/normalize.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar**

`src/lib/exercises/normalize.ts`:

```ts
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
```

- [ ] **Step 4: Ejecutar y ver pasar**

Run: `npm test -- src/lib/exercises/normalize.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: normalización de respuestas de ejercicios"
```

---

## Task 6: Corrección de ejercicios — grading determinista

**Files:**
- Create: `src/lib/exercises/grade.ts`, `src/lib/exercises/grade.test.ts`

**Interfaces:**
- Consumes: `isFillBlankCorrect` de `./normalize`.
- Produces:
  - `type GradeResult = { correctCount: number; totalCount: number; score: number }` (`score` = `Math.round(correctCount / totalCount * 100)`, `0` si `totalCount === 0`).
  - `gradeMultipleChoice(answers: (number|null)[], questions: { correctIndex: number }[]): GradeResult`
  - `gradeFillBlanks(answers: string[], items: { answer: string; acceptedVariants: string[] }[]): GradeResult`
  - `gradeOrderWords(answers: string[][], items: { correctOrder: string[] }[]): GradeResult`
  - `gradeMatching(userPairs: Record<number, number>, pairCount: number): GradeResult` — el usuario relaciona el índice izquierdo `i` con el índice derecho elegido; correcto cuando `userPairs[i] === i` (los pares se guardan alineados y el orden derecho se baraja en la UI mediante un mapa de posiciones que la UI revierte antes de llamar).

- [ ] **Step 1: Escribir los tests**

`src/lib/exercises/grade.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  gradeMultipleChoice,
  gradeFillBlanks,
  gradeOrderWords,
  gradeMatching,
} from './grade'

describe('gradeMultipleChoice', () => {
  it('cuenta aciertos y calcula score', () => {
    const qs = [{ correctIndex: 1 }, { correctIndex: 0 }, { correctIndex: 3 }]
    expect(gradeMultipleChoice([1, 2, 3], qs)).toEqual({
      correctCount: 2,
      totalCount: 3,
      score: 67,
    })
  })
  it('respuesta null cuenta como fallo', () => {
    expect(gradeMultipleChoice([null], [{ correctIndex: 0 }]).correctCount).toBe(0)
  })
})

describe('gradeFillBlanks', () => {
  it('usa normalización y variantes', () => {
    const items = [
      { answer: 'went', acceptedVariants: [] },
      { answer: 'did not', acceptedVariants: ["didn't"] },
    ]
    expect(gradeFillBlanks(['WENT', "didn't"], items)).toEqual({
      correctCount: 2,
      totalCount: 2,
      score: 100,
    })
  })
})

describe('gradeOrderWords', () => {
  it('correcto solo si el orden coincide exactamente', () => {
    const items = [{ correctOrder: ['I', 'am', 'here'] }, { correctOrder: ['she', 'runs'] }]
    expect(gradeOrderWords([['I', 'am', 'here'], ['runs', 'she']], items)).toEqual({
      correctCount: 1,
      totalCount: 2,
      score: 50,
    })
  })
})

describe('gradeMatching', () => {
  it('cuenta pares alineados', () => {
    expect(gradeMatching({ 0: 0, 1: 2, 2: 2 }, 3)).toEqual({
      correctCount: 2,
      totalCount: 3,
      score: 67,
    })
  })
})
```

- [ ] **Step 2: Ejecutar y ver fallar**

Run: `npm test -- src/lib/exercises/grade.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar**

`src/lib/exercises/grade.ts`:

```ts
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
  userPairs: Record<number, number>,
  pairCount: number,
): GradeResult {
  let correct = 0
  for (let i = 0; i < pairCount; i++) {
    if (userPairs[i] === i) correct++
  }
  return result(correct, pairCount)
}
```

- [ ] **Step 4: Ejecutar y ver pasar**

Run: `npm test -- src/lib/exercises/grade.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: grading determinista de ejercicios"
```

---

## Task 7: `Profile` — `getProfile` y `recordActivity`

**Files:**
- Create: `src/lib/dates.ts`, `src/lib/dates.test.ts`
- Create: `src/lib/profile.ts`, `src/lib/profile.test.ts`

**Interfaces:**
- Consumes: `prisma` de `@/lib/db`.
- Produces:
  - `dayDiff(a: Date, b: Date): number` — diferencia en días de calendario local (`b` menos `a`), ignorando la hora.
  - `getProfile(): Promise<Profile>` — devuelve la fila `id: 1`, la crea si no existe.
  - `recordActivity(input: { xp: number; now?: Date }): Promise<Profile>` — en una transacción: suma `xp`, actualiza racha según `lastActivityDate`, actualiza `longestStreak` y `lastActivityDate = now`.

- [ ] **Step 1: Tests de `dayDiff`**

`src/lib/dates.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { dayDiff } from './dates'

describe('dayDiff', () => {
  it('mismo día => 0 aunque cambie la hora', () => {
    expect(dayDiff(new Date('2026-09-01T23:00'), new Date('2026-09-01T01:00'))).toBe(0)
  })
  it('días consecutivos => 1', () => {
    expect(dayDiff(new Date('2026-09-01T10:00'), new Date('2026-09-02T09:00'))).toBe(1)
  })
  it('hueco de 3 días', () => {
    expect(dayDiff(new Date('2026-09-01T10:00'), new Date('2026-09-04T09:00'))).toBe(3)
  })
})
```

- [ ] **Step 2: Ejecutar y ver fallar; luego implementar `src/lib/dates.ts`**

```ts
export function dayDiff(a: Date, b: Date): number {
  const da = new Date(a.getFullYear(), a.getMonth(), a.getDate())
  const db = new Date(b.getFullYear(), b.getMonth(), b.getDate())
  return Math.round((db.getTime() - da.getTime()) / 86_400_000)
}
```

Run: `npm test -- src/lib/dates.test.ts` → PASS.

- [ ] **Step 3: Tests de `profile.ts`**

`src/lib/profile.test.ts` (limpia el `Profile` antes de cada test para aislar):

```ts
import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { prisma } from './db'
import { getProfile, recordActivity } from './profile'

beforeEach(async () => {
  await prisma.profile.deleteMany()
})
afterAll(async () => {
  await prisma.profile.deleteMany()
  await prisma.$disconnect()
})

describe('getProfile', () => {
  it('crea la fila si no existe y la reutiliza', async () => {
    const a = await getProfile()
    const b = await getProfile()
    expect(a.id).toBe(b.id)
    expect(a.xp).toBe(0)
  })
})

describe('recordActivity', () => {
  it('primera actividad => racha 1', async () => {
    const p = await recordActivity({ xp: 10, now: new Date('2026-09-01T10:00') })
    expect(p.xp).toBe(10)
    expect(p.currentStreak).toBe(1)
    expect(p.longestStreak).toBe(1)
  })
  it('actividad el día siguiente => racha +1', async () => {
    await recordActivity({ xp: 10, now: new Date('2026-09-01T10:00') })
    const p = await recordActivity({ xp: 5, now: new Date('2026-09-02T10:00') })
    expect(p.xp).toBe(15)
    expect(p.currentStreak).toBe(2)
  })
  it('misma fecha dos veces => racha sin cambio', async () => {
    await recordActivity({ xp: 10, now: new Date('2026-09-01T08:00') })
    const p = await recordActivity({ xp: 10, now: new Date('2026-09-01T20:00') })
    expect(p.currentStreak).toBe(1)
  })
  it('hueco de 2+ días => racha se reinicia a 1, longest se conserva', async () => {
    await recordActivity({ xp: 10, now: new Date('2026-09-01T10:00') })
    await recordActivity({ xp: 10, now: new Date('2026-09-02T10:00') })
    const p = await recordActivity({ xp: 10, now: new Date('2026-09-05T10:00') })
    expect(p.currentStreak).toBe(1)
    expect(p.longestStreak).toBe(2)
  })
})
```

- [ ] **Step 4: Ejecutar y ver fallar**

Run: `npm test -- src/lib/profile.test.ts`
Expected: FAIL.

- [ ] **Step 5: Implementar `src/lib/profile.ts`**

```ts
import type { Profile } from '@prisma/client'
import { prisma } from './db'
import { dayDiff } from './dates'

export async function getProfile(): Promise<Profile> {
  return prisma.profile.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  })
}

export async function recordActivity(input: {
  xp: number
  now?: Date
}): Promise<Profile> {
  const now = input.now ?? new Date()
  return prisma.$transaction(async (tx) => {
    const current = await tx.profile.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1 },
    })

    let streak: number
    if (!current.lastActivityDate) {
      streak = 1
    } else {
      const diff = dayDiff(current.lastActivityDate, now)
      if (diff === 0) streak = current.currentStreak
      else if (diff === 1) streak = current.currentStreak + 1
      else streak = 1
    }

    return tx.profile.update({
      where: { id: 1 },
      data: {
        xp: current.xp + Math.max(0, input.xp),
        currentStreak: streak,
        longestStreak: Math.max(current.longestStreak, streak),
        lastActivityDate: now,
      },
    })
  })
}
```

- [ ] **Step 6: Ejecutar y ver pasar**

Run: `npm test -- src/lib/profile.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: Profile con getProfile y recordActivity"
```

---

## Task 8: Esquemas zod del contenido de ejercicios

**Files:**
- Create: `src/lib/validation/exercises.ts`, `src/lib/validation/exercises.test.ts`
- Create: `src/lib/validation/fixtures/exercises.ts` (fixtures válidos)

**Interfaces:**
- Consumes: `zod`.
- Produces:
  - `multipleChoiceSchema`, `fillBlanksSchema`, `matchingSchema`, `orderWordsSchema`, `flashcardsSchema` (todos `z.object` con una clave `items`).
  - `exerciseSchemaFor(type: ExerciseType): ZodSchema`
  - Tipos inferidos exportados: `MultipleChoiceContent`, `FillBlanksContent`, `MatchingContent`, `OrderWordsContent`, `FlashcardsContent`.
  - `parseExerciseContent(type, raw): <ContentUnion>` — lanza si no valida.
  - Conteos fijos: MC 10, fill 10, matching 8, order 6, flashcards 15. Los esquemas usan `.min(1)` (no exigen el conteo exacto: si la IA devuelve 9 sigue siendo usable), pero los prompts sí piden el número exacto.

- [ ] **Step 1: Escribir los tests**

`src/lib/validation/exercises.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { exerciseSchemaFor, parseExerciseContent } from './exercises'
import * as fx from './fixtures/exercises'

describe('exerciseSchemaFor', () => {
  it('valida fixtures correctos de cada tipo', () => {
    expect(exerciseSchemaFor('MULTIPLE_CHOICE').safeParse(fx.multipleChoice).success).toBe(true)
    expect(exerciseSchemaFor('FILL_BLANKS').safeParse(fx.fillBlanks).success).toBe(true)
    expect(exerciseSchemaFor('MATCHING').safeParse(fx.matching).success).toBe(true)
    expect(exerciseSchemaFor('ORDER_WORDS').safeParse(fx.orderWords).success).toBe(true)
    expect(exerciseSchemaFor('FLASHCARDS').safeParse(fx.flashcards).success).toBe(true)
  })

  it('rechaza opción múltiple con correctIndex fuera de rango', () => {
    const bad = { items: [{ question: 'q', options: ['a', 'b'], correctIndex: 5, explanation: 'e' }] }
    expect(exerciseSchemaFor('MULTIPLE_CHOICE').safeParse(bad).success).toBe(false)
  })

  it('rechaza JSON con forma equivocada', () => {
    expect(exerciseSchemaFor('FLASHCARDS').safeParse({ foo: 1 }).success).toBe(false)
  })
})

describe('parseExerciseContent', () => {
  it('lanza con contenido inválido', () => {
    expect(() => parseExerciseContent('MATCHING', { items: [] })).toThrow()
  })
  it('devuelve el objeto tipado con contenido válido', () => {
    const c = parseExerciseContent('FLASHCARDS', fx.flashcards)
    expect(c.items.length).toBe(15)
  })
})
```

- [ ] **Step 2: Crear fixtures**

`src/lib/validation/fixtures/exercises.ts` — objetos que cumplen los conteos exactos (10/10/8/6/15). Ejemplo abreviado de estructura; el implementador rellena hasta el conteo:

```ts
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
```

- [ ] **Step 3: Ejecutar y ver fallar**

Run: `npm test -- src/lib/validation/exercises.test.ts`
Expected: FAIL.

- [ ] **Step 4: Implementar `src/lib/validation/exercises.ts`**

```ts
import { z } from 'zod'
import type { ExerciseType } from '@prisma/client'

export const multipleChoiceSchema = z.object({
  items: z
    .array(
      z
        .object({
          question: z.string().min(1),
          options: z.array(z.string().min(1)).min(2).max(6),
          correctIndex: z.number().int().min(0),
          explanation: z.string().min(1),
        })
        .refine((q) => q.correctIndex < q.options.length, {
          message: 'correctIndex fuera de rango',
        }),
    )
    .min(1),
})

export const fillBlanksSchema = z.object({
  items: z
    .array(
      z.object({
        sentence: z.string().includes('___'),
        answer: z.string().min(1),
        acceptedVariants: z.array(z.string()).default([]),
      }),
    )
    .min(1),
})

export const matchingSchema = z.object({
  items: z.array(z.object({ left: z.string().min(1), right: z.string().min(1) })).min(2),
})

export const orderWordsSchema = z.object({
  items: z
    .array(
      z
        .object({
          scrambled: z.array(z.string().min(1)).min(2),
          correctOrder: z.array(z.string().min(1)).min(2),
        })
        .refine((it) => it.scrambled.length === it.correctOrder.length, {
          message: 'scrambled y correctOrder deben tener la misma longitud',
        }),
    )
    .min(1),
})

export const flashcardsSchema = z.object({
  items: z.array(z.object({ front: z.string().min(1), back: z.string().min(1) })).min(1),
})

export type MultipleChoiceContent = z.infer<typeof multipleChoiceSchema>
export type FillBlanksContent = z.infer<typeof fillBlanksSchema>
export type MatchingContent = z.infer<typeof matchingSchema>
export type OrderWordsContent = z.infer<typeof orderWordsSchema>
export type FlashcardsContent = z.infer<typeof flashcardsSchema>
export type ExerciseContent =
  | MultipleChoiceContent
  | FillBlanksContent
  | MatchingContent
  | OrderWordsContent
  | FlashcardsContent

const byType = {
  MULTIPLE_CHOICE: multipleChoiceSchema,
  FILL_BLANKS: fillBlanksSchema,
  MATCHING: matchingSchema,
  ORDER_WORDS: orderWordsSchema,
  FLASHCARDS: flashcardsSchema,
} as const

export function exerciseSchemaFor(type: ExerciseType) {
  return byType[type]
}

export function parseExerciseContent(type: ExerciseType, raw: unknown) {
  return byType[type].parse(raw)
}
```

- [ ] **Step 5: Ejecutar y ver pasar**

Run: `npm test -- src/lib/validation/exercises.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: esquemas zod del contenido de ejercicios"
```

---

## Task 9: Esquemas zod de speaking (`TurnReview` y opener guiado)

**Files:**
- Create: `src/lib/validation/speaking.ts`, `src/lib/validation/speaking.test.ts`

**Interfaces:**
- Consumes: `zod`.
- Produces:
  - `guidedOpenerSchema` = `z.object({ assistantPrompt: z.string().min(1) })`.
  - `turnReviewSchema` = `z.object({ correctedText: string, naturalVersion: string, fluencyTip: string, nextAssistantPrompt: z.string().nullable() })`.
  - Tipos `GuidedOpener`, `TurnReview`.
  - `parseTurnReview(raw): TurnReview`, `parseGuidedOpener(raw): GuidedOpener`.

- [ ] **Step 1: Tests**

`src/lib/validation/speaking.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { parseTurnReview, parseGuidedOpener } from './speaking'

describe('parseTurnReview', () => {
  it('acepta review con nextAssistantPrompt', () => {
    const r = parseTurnReview({
      correctedText: 'I woke up at six.',
      naturalVersion: 'I usually wake up at six.',
      fluencyTip: 'Use "usually" for habits.',
      nextAssistantPrompt: 'What did you have for breakfast?',
    })
    expect(r.nextAssistantPrompt).toContain('breakfast')
  })
  it('acepta review con nextAssistantPrompt null (monólogo / turno final)', () => {
    const r = parseTurnReview({
      correctedText: 'x',
      naturalVersion: 'y',
      fluencyTip: 'z',
      nextAssistantPrompt: null,
    })
    expect(r.nextAssistantPrompt).toBeNull()
  })
  it('rechaza si falta un campo', () => {
    expect(() => parseTurnReview({ correctedText: 'x' })).toThrow()
  })
})

describe('parseGuidedOpener', () => {
  it('exige assistantPrompt no vacío', () => {
    expect(() => parseGuidedOpener({ assistantPrompt: '' })).toThrow()
    expect(parseGuidedOpener({ assistantPrompt: 'Tell me about your day.' }).assistantPrompt).toBeTruthy()
  })
})
```

- [ ] **Step 2: Ejecutar y ver fallar; luego implementar `src/lib/validation/speaking.ts`**

```ts
import { z } from 'zod'

export const guidedOpenerSchema = z.object({
  assistantPrompt: z.string().min(1),
})

export const turnReviewSchema = z.object({
  correctedText: z.string().min(1),
  naturalVersion: z.string().min(1),
  fluencyTip: z.string().min(1),
  nextAssistantPrompt: z.string().min(1).nullable(),
})

export type GuidedOpener = z.infer<typeof guidedOpenerSchema>
export type TurnReview = z.infer<typeof turnReviewSchema>

export function parseGuidedOpener(raw: unknown): GuidedOpener {
  return guidedOpenerSchema.parse(raw)
}
export function parseTurnReview(raw: unknown): TurnReview {
  return turnReviewSchema.parse(raw)
}
```

Run: `npm test -- src/lib/validation/speaking.test.ts` → PASS.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: esquemas zod de speaking"
```

---

## Task 10: Capa de IA — `withRetry` y `AiError`

**Files:**
- Create: `src/lib/ai/retry.ts`, `src/lib/ai/retry.test.ts`
- Create: `src/lib/ai/config.ts`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `class AiError extends Error` con `label: string` y `cause?: unknown`.
  - `withRetry<T>(fn: () => Promise<T>, label: string): Promise<T>` — ejecuta `fn`; si lanza, espera 400 ms y reintenta una vez; si vuelve a fallar lanza `AiError(label, ...)`.
  - `config.ts`: `MODELS = { stt: 'gpt-4o-transcribe', chat: 'gpt-4o', tts: 'gpt-4o-mini-tts' }`, `TTS_VOICE = 'alloy'`, `isAiEnabled(): boolean`.

- [ ] **Step 1: Tests de `withRetry`**

`src/lib/ai/retry.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest'
import { withRetry, AiError } from './retry'

describe('withRetry', () => {
  it('devuelve el valor si fn tiene éxito a la primera', async () => {
    const fn = vi.fn().mockResolvedValue(42)
    expect(await withRetry(fn, 'x')).toBe(42)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('reintenta una vez y devuelve el segundo resultado', async () => {
    const fn = vi.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValue('ok')
    expect(await withRetry(fn, 'x')).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('tras dos fallos lanza AiError con el label', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('boom'))
    await expect(withRetry(fn, 'transcribe')).rejects.toBeInstanceOf(AiError)
    await expect(withRetry(fn, 'transcribe')).rejects.toMatchObject({ label: 'transcribe' })
  })
})
```

- [ ] **Step 2: Ejecutar y ver fallar; luego implementar `src/lib/ai/retry.ts`**

```ts
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
```

- [ ] **Step 3: Implementar `src/lib/ai/config.ts`**

```ts
export const MODELS = {
  stt: 'gpt-4o-transcribe',
  chat: 'gpt-4o',
  tts: 'gpt-4o-mini-tts',
} as const

export const TTS_VOICE = 'alloy'

export function isAiEnabled(): boolean {
  return Boolean(process.env.OPENAI_API_KEY)
}
```

- [ ] **Step 4: Ejecutar y ver pasar**

Run: `npm test -- src/lib/ai/retry.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: withRetry, AiError y config de IA"
```

---

## Task 11: Capa de IA — wrappers de OpenAI

**Files:**
- Create: `src/lib/ai/client.ts`, `src/lib/ai/prompts.ts`, `src/lib/ai/transcribe.ts`, `src/lib/ai/exercises.ts`, `src/lib/ai/speaking.ts`, `src/lib/ai/tts.ts`, `src/lib/ai/index.ts`
- Create: `src/lib/ai/exercises.test.ts`

**Interfaces:**
- Consumes: `openai`, `withRetry`, `MODELS`, `TTS_VOICE`, esquemas zod de Tasks 8–9.
- Produces (todo re-exportado desde `src/lib/ai/index.ts`):
  - `transcribe(audio: Buffer, filename?: string): Promise<string>`
  - `generateExercises(unitText: string, type: ExerciseType): Promise<ExerciseContent>` — ya validado con zod.
  - `generateGuidedOpener(topic: string): Promise<string>` — devuelve `assistantPrompt`.
  - `reviewSpeakingTurn(input: { transcript: string; topic: string; mode: SpeakingMode; turnIndex: number; totalTurns: number; history: { role: 'assistant' | 'user'; text: string }[] }): Promise<TurnReview>`
  - `synthesizeSpeech(text: string): Promise<Buffer>`

- [ ] **Step 1: `src/lib/ai/client.ts`**

```ts
import OpenAI from 'openai'

let cached: OpenAI | null = null

export function openai(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY no está configurada')
  }
  cached ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  return cached
}
```

- [ ] **Step 2: `src/lib/ai/prompts.ts`** — texto de los prompts, en un solo sitio

```ts
import type { ExerciseType } from '@prisma/client'

const COUNTS: Record<ExerciseType, number> = {
  MULTIPLE_CHOICE: 10,
  FILL_BLANKS: 10,
  MATCHING: 8,
  ORDER_WORDS: 6,
  FLASHCARDS: 15,
}

const SHAPE: Record<ExerciseType, string> = {
  MULTIPLE_CHOICE:
    '{ "items": [{ "question": string, "options": string[4], "correctIndex": number (0-3), "explanation": string }] }',
  FILL_BLANKS:
    '{ "items": [{ "sentence": string con "___" para el hueco, "answer": string, "acceptedVariants": string[] }] }',
  MATCHING: '{ "items": [{ "left": string (término inglés), "right": string (definición o traducción) }] }',
  ORDER_WORDS:
    '{ "items": [{ "scrambled": string[] (palabras desordenadas), "correctOrder": string[] (mismas palabras ordenadas) }] }',
  FLASHCARDS: '{ "items": [{ "front": string (inglés), "back": string (español) }] }',
}

export function exercisePrompt(unitText: string, type: ExerciseType): { system: string; user: string } {
  return {
    system:
      'Eres un profesor de inglés que crea ejercicios a partir del texto de una unidad de un libro. ' +
      'Responde SOLO con JSON válido que cumpla exactamente la forma indicada. El contenido de los ejercicios está en inglés; las traducciones y definiciones en español.',
    user:
      `Crea ${COUNTS[type]} ítems de tipo ${type}.\n` +
      `Forma JSON exacta: ${SHAPE[type]}\n\n` +
      `Texto de la unidad:\n"""\n${unitText.slice(0, 8000)}\n"""`,
  }
}

export function guidedOpenerPrompt(topic: string): { system: string; user: string } {
  return {
    system:
      'Eres un tutor de conversación en inglés. Devuelve SOLO JSON: { "assistantPrompt": string }. ' +
      'assistantPrompt es una pregunta abierta y natural en inglés para iniciar una conversación sobre el tema dado.',
    user: `Tema: ${topic}`,
  }
}

export function turnReviewPrompt(input: {
  transcript: string
  topic: string
  mode: 'GUIDED' | 'MONOLOGUE'
  turnIndex: number
  totalTurns: number
  history: { role: 'assistant' | 'user'; text: string }[]
}): { system: string; user: string } {
  const wantNext = input.mode === 'GUIDED' && input.turnIndex < input.totalTurns
  return {
    system:
      'Eres un tutor de inglés que corrige la intervención hablada de un estudiante. ' +
      'Devuelve SOLO JSON con esta forma exacta: ' +
      '{ "correctedText": string, "naturalVersion": string, "fluencyTip": string, "nextAssistantPrompt": string | null }. ' +
      'correctedText: la frase del estudiante con la gramática corregida, mínimo cambio. ' +
      'naturalVersion: cómo lo diría un hablante nativo de forma natural. ' +
      'fluencyTip: un consejo breve y accionable en español. ' +
      (wantNext
        ? 'nextAssistantPrompt: la siguiente pregunta del tutor en inglés para continuar la conversación.'
        : 'nextAssistantPrompt: debe ser null.'),
    user:
      `Tema: ${input.topic}\nTurno ${input.turnIndex} de ${input.totalTurns}\n` +
      `Historial:\n${input.history.map((h) => `${h.role}: ${h.text}`).join('\n')}\n\n` +
      `Transcripción de lo que dijo el estudiante en este turno:\n"${input.transcript}"`,
  }
}
```

- [ ] **Step 3: `src/lib/ai/transcribe.ts`**

```ts
import { toFile } from 'openai'
import { openai } from './client'
import { MODELS } from './config'
import { withRetry } from './retry'

export async function transcribe(audio: Buffer, filename = 'audio.webm'): Promise<string> {
  return withRetry(async () => {
    const file = await toFile(audio, filename, { type: 'audio/webm' })
    const res = await openai().audio.transcriptions.create({
      model: MODELS.stt,
      file,
    })
    return res.text.trim()
  }, 'transcribe')
}
```

- [ ] **Step 4: `src/lib/ai/exercises.ts`**

```ts
import type { ExerciseType } from '@prisma/client'
import { openai } from './client'
import { MODELS } from './config'
import { withRetry, AiError } from './retry'
import { exercisePrompt } from './prompts'
import { parseExerciseContent, type ExerciseContent } from '@/lib/validation/exercises'

export async function generateExercises(
  unitText: string,
  type: ExerciseType,
): Promise<ExerciseContent> {
  const { system, user } = exercisePrompt(unitText, type)
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

- [ ] **Step 5: `src/lib/ai/speaking.ts`**

```ts
import type { SpeakingMode } from '@prisma/client'
import { openai } from './client'
import { MODELS } from './config'
import { withRetry, AiError } from './retry'
import { guidedOpenerPrompt, turnReviewPrompt } from './prompts'
import { parseGuidedOpener, parseTurnReview, type TurnReview } from '@/lib/validation/speaking'

async function jsonChat(system: string, user: string, label: string): Promise<unknown> {
  const res = await openai().chat.completions.create({
    model: MODELS.chat,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  })
  const raw = res.choices[0]?.message?.content
  if (!raw) throw new AiError(label)
  return JSON.parse(raw)
}

export async function generateGuidedOpener(topic: string): Promise<string> {
  const { system, user } = guidedOpenerPrompt(topic)
  return withRetry(async () => {
    const parsed = parseGuidedOpener(await jsonChat(system, user, 'generateGuidedOpener'))
    return parsed.assistantPrompt
  }, 'generateGuidedOpener')
}

export async function reviewSpeakingTurn(input: {
  transcript: string
  topic: string
  mode: SpeakingMode
  turnIndex: number
  totalTurns: number
  history: { role: 'assistant' | 'user'; text: string }[]
}): Promise<TurnReview> {
  const { system, user } = turnReviewPrompt(input)
  return withRetry(async () => {
    const review = parseTurnReview(await jsonChat(system, user, 'reviewSpeakingTurn'))
    // fuerza la regla de negocio aunque el modelo se desvíe
    if (input.mode === 'MONOLOGUE' || input.turnIndex >= input.totalTurns) {
      return { ...review, nextAssistantPrompt: null }
    }
    return review
  }, 'reviewSpeakingTurn')
}
```

- [ ] **Step 6: `src/lib/ai/tts.ts`**

```ts
import { openai } from './client'
import { MODELS, TTS_VOICE } from './config'
import { withRetry } from './retry'

export async function synthesizeSpeech(text: string): Promise<Buffer> {
  return withRetry(async () => {
    const res = await openai().audio.speech.create({
      model: MODELS.tts,
      voice: TTS_VOICE,
      input: text,
      response_format: 'mp3',
    })
    return Buffer.from(await res.arrayBuffer())
  }, 'synthesizeSpeech')
}
```

- [ ] **Step 7: `src/lib/ai/index.ts`**

```ts
export { transcribe } from './transcribe'
export { generateExercises } from './exercises'
export { generateGuidedOpener, reviewSpeakingTurn } from './speaking'
export { synthesizeSpeech } from './tts'
export { isAiEnabled, MODELS } from './config'
export { AiError } from './retry'
```

- [ ] **Step 8: Test de `generateExercises` con el SDK mockeado**

`src/lib/ai/exercises.test.ts`:

```ts
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
```

- [ ] **Step 9: Ejecutar los tests**

Run: `npm test -- src/lib/ai/`
Expected: PASS. Ajustar `toFile`/import si el SDK expone la utilidad en otra ruta (`openai/uploads`).

- [ ] **Step 10: `npm run build` para validar tipos**

Run: `npm run build`
Expected: sin errores de tipos.

- [ ] **Step 11: Commit**

```bash
git add -A && git commit -m "feat: wrappers de OpenAI (STT, ejercicios, speaking, TTS)"
```

---

## Task 12: Almacenamiento de archivos en disco

**Files:**
- Create: `src/lib/storage.ts`, `src/lib/storage.test.ts`

**Interfaces:**
- Consumes: `node:fs/promises`, `node:path`, `node:crypto`.
- Produces:
  - `BOOKS_DIR`, `AUDIO_DIR` (absolutos, bajo `process.cwd()/storage`).
  - `saveBookFile(bytes: Buffer, originalName: string): Promise<{ path: string; filename: string }>` — guarda con nombre `<cuid-ish>-<sanitizado>.pdf`, devuelve ruta absoluta y filename.
  - `saveAudioFile(bytes: Buffer, ext: 'webm' | 'mp3'): Promise<string>` — devuelve la ruta **relativa** (p.ej. `a/1a2b3c.mp3`) que se guarda en DB.
  - `readAudioFile(relPath: string): Promise<Buffer>` — resuelve contra `AUDIO_DIR`, rechaza rutas con `..`.
  - Crea los directorios si no existen.

- [ ] **Step 1: Tests**

`src/lib/storage.test.ts`:

```ts
import { describe, it, expect, afterAll } from 'vitest'
import { rm } from 'node:fs/promises'
import { saveAudioFile, readAudioFile, AUDIO_DIR } from './storage'

afterAll(async () => {
  await rm(AUDIO_DIR, { recursive: true, force: true })
})

describe('audio storage', () => {
  it('guarda y relee el mismo contenido', async () => {
    const rel = await saveAudioFile(Buffer.from('hola'), 'mp3')
    expect(rel).toMatch(/\.mp3$/)
    expect((await readAudioFile(rel)).toString()).toBe('hola')
  })

  it('readAudioFile rechaza path traversal', async () => {
    await expect(readAudioFile('../../etc/passwd')).rejects.toThrow()
  })
})
```

- [ ] **Step 2: Ejecutar y ver fallar; luego implementar `src/lib/storage.ts`**

```ts
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join, resolve, sep } from 'node:path'
import { randomUUID } from 'node:crypto'

export const STORAGE_ROOT = join(process.cwd(), 'storage')
export const BOOKS_DIR = join(STORAGE_ROOT, 'books')
export const AUDIO_DIR = join(STORAGE_ROOT, 'audio')

async function ensure(dir: string) {
  await mkdir(dir, { recursive: true })
}

function sanitize(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 60)
}

export async function saveBookFile(bytes: Buffer, originalName: string) {
  await ensure(BOOKS_DIR)
  const filename = `${randomUUID()}-${sanitize(originalName)}`
  const path = join(BOOKS_DIR, filename)
  await writeFile(path, bytes)
  return { path, filename }
}

export async function saveAudioFile(bytes: Buffer, ext: 'webm' | 'mp3'): Promise<string> {
  const id = randomUUID()
  const sub = id.slice(0, 2)
  await ensure(join(AUDIO_DIR, sub))
  const rel = join(sub, `${id}.${ext}`)
  await writeFile(join(AUDIO_DIR, rel), bytes)
  return rel
}

export async function readAudioFile(relPath: string): Promise<Buffer> {
  const abs = resolve(AUDIO_DIR, relPath)
  if (abs !== AUDIO_DIR && !abs.startsWith(AUDIO_DIR + sep)) {
    throw new Error('ruta de audio inválida')
  }
  return readFile(abs)
}
```

- [ ] **Step 3: Ejecutar y ver pasar**

Run: `npm test -- src/lib/storage.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: almacenamiento de PDFs y audio en disco"
```

---

## Task 13: Shell de UI — layout, sidebar, cabecera, tema y componentes base

**Files:**
- Create: `src/components/ui/Card.tsx`, `Button.tsx`, `ProgressBar.tsx`, `ProgressRing.tsx`, `Spinner.tsx`, `Tabs.tsx`
- Create: `src/components/Sidebar.tsx`, `src/components/StatsHeader.tsx`, `src/components/ThemeToggle.tsx`, `src/components/Providers.tsx`
- Modify: `src/app/layout.tsx`, `src/app/globals.css`, `src/app/page.tsx`

**Interfaces:**
- Consumes: `getProfile` (Task 7), `levelFromXp` (Task 3), `next-themes`.
- Produces:
  - `<Card>`, `<Button variant?>`, `<ProgressBar value max>`, `<ProgressRing percent size?>`, `<Spinner label?>`, `<Tabs tabs={[{id,label}]} active onChange>` — todos client o server según necesidad; `Tabs` es client.
  - `<Sidebar>` — server component con `<Link>` a las 5 rutas y estado activo (usa `usePathname` → es client).
  - `<StatsHeader>` — async server component: lee `getProfile`, muestra racha, XP, nivel + `<ProgressBar>`.
  - `<Providers>` — client, envuelve en `ThemeProvider` de `next-themes` (`attribute="class"`, `defaultTheme="light"`).

- [ ] **Step 1: Paleta en `globals.css`**

Añadir tras las directivas de Tailwind:

```css
:root {
  --bg: #f7f7fb;
  --surface: #ffffff;
  --border: #e6e6ef;
  --text: #1b1b2f;
  --muted: #6b6b83;
  --primary: #6d5efc;
  --primary-contrast: #ffffff;
  --success: #22c55e;
  --warning: #f59e0b;
}
.dark {
  --bg: #0e0e18;
  --surface: #171724;
  --border: #262637;
  --text: #ececf5;
  --muted: #9a9ab5;
  --primary: #8b7dff;
}
body {
  background: var(--bg);
  color: var(--text);
}
```

- [ ] **Step 2: Componentes `ui/` (código completo)**

`src/components/ui/Card.tsx`:

```tsx
export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border p-5 ${className}`}
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      {children}
    </div>
  )
}
```

`src/components/ui/Button.tsx`:

```tsx
'use client'
type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost'
}
export function Button({ variant = 'primary', className = '', ...rest }: Props) {
  const base = 'rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed'
  const styles =
    variant === 'primary'
      ? { background: 'var(--primary)', color: 'var(--primary-contrast)' }
      : { background: 'transparent', color: 'var(--text)', border: '1px solid var(--border)' }
  return <button className={`${base} ${className}`} style={styles} {...rest} />
}
```

`src/components/ui/ProgressBar.tsx`:

```tsx
export function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max <= 0 ? 0 : Math.min(100, Math.round((value / max) * 100))
  return (
    <div className="h-2 w-full rounded-full" style={{ background: 'var(--border)' }}>
      <div className="h-2 rounded-full" style={{ width: `${pct}%`, background: 'var(--primary)' }} />
    </div>
  )
}
```

`src/components/ui/ProgressRing.tsx`:

```tsx
export function ProgressRing({ percent, size = 120 }: { percent: number; size?: number }) {
  const r = size / 2 - 8
  const c = 2 * Math.PI * r
  const p = Math.max(0, Math.min(100, percent))
  return (
    <svg width={size} height={size}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={8} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--primary)"
        strokeWidth={8}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c - (c * p) / 100}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="50%" textAnchor="middle" dy=".3em" fill="var(--text)" fontSize={size / 6}>
        {p}%
      </text>
    </svg>
  )
}
```

`src/components/ui/Spinner.tsx`:

```tsx
export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--muted)' }}>
      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      {label}
    </div>
  )
}
```

`src/components/ui/Tabs.tsx`:

```tsx
'use client'
export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: string; label: string }[]
  active: string
  onChange: (id: string) => void
}) {
  return (
    <div className="flex gap-2 border-b" style={{ borderColor: 'var(--border)' }}>
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className="px-3 py-2 text-sm"
          style={{
            color: active === t.id ? 'var(--primary)' : 'var(--muted)',
            borderBottom: active === t.id ? '2px solid var(--primary)' : '2px solid transparent',
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: `src/components/ThemeToggle.tsx`**

```tsx
'use client'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null
  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="text-sm"
      style={{ color: 'var(--muted)' }}
    >
      {theme === 'dark' ? '☀️ Claro' : '🌙 Oscuro'}
    </button>
  )
}
```

- [ ] **Step 4: `src/components/Providers.tsx`**

```tsx
'use client'
import { ThemeProvider } from 'next-themes'
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      {children}
    </ThemeProvider>
  )
}
```

- [ ] **Step 5: `src/components/Sidebar.tsx`**

```tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ThemeToggle } from './ThemeToggle'

const LINKS = [
  { href: '/', label: 'Inicio' },
  { href: '/learn', label: 'Aprender' },
  { href: '/speaking', label: 'Practicar speaking' },
  { href: '/library', label: 'Biblioteca' },
  { href: '/progress', label: 'Progreso' },
]

export function Sidebar() {
  const path = usePathname()
  return (
    <aside
      className="flex w-56 shrink-0 flex-col justify-between border-r p-4"
      style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
    >
      <nav className="flex flex-col gap-1">
        <div className="mb-4 text-lg font-bold" style={{ color: 'var(--primary)' }}>
          English Tutor
        </div>
        {LINKS.map((l) => {
          const active = l.href === '/' ? path === '/' : path.startsWith(l.href)
          return (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-lg px-3 py-2 text-sm"
              style={{
                background: active ? 'var(--primary)' : 'transparent',
                color: active ? 'var(--primary-contrast)' : 'var(--text)',
              }}
            >
              {l.label}
            </Link>
          )
        })}
      </nav>
      <ThemeToggle />
    </aside>
  )
}
```

- [ ] **Step 6: `src/components/StatsHeader.tsx`**

```tsx
import { getProfile } from '@/lib/profile'
import { levelFromXp } from '@/lib/gamification/level'
import { ProgressBar } from './ui/ProgressBar'

export async function StatsHeader() {
  const profile = await getProfile()
  const { level, xpIntoLevel, xpForNextLevel } = levelFromXp(profile.xp)
  return (
    <header
      className="flex items-center gap-6 border-b px-6 py-3 text-sm"
      style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
    >
      <span>🔥 {profile.currentStreak} días</span>
      <span>⭐ {profile.xp} XP</span>
      <div className="flex items-center gap-2">
        <span>Nivel {level}</span>
        <div className="w-40">
          <ProgressBar value={xpIntoLevel} max={xpForNextLevel} />
        </div>
      </div>
    </header>
  )
}
```

- [ ] **Step 7: `src/app/layout.tsx`**

```tsx
import type { Metadata } from 'next'
import './globals.css'
import { Providers } from '@/components/Providers'
import { Sidebar } from '@/components/Sidebar'
import { StatsHeader } from '@/components/StatsHeader'
import { AiDisabledBanner } from '@/components/AiDisabledBanner'

export const metadata: Metadata = { title: 'English Academy Tutor' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>
        <Providers>
          <div className="flex min-h-screen">
            <Sidebar />
            <div className="flex min-w-0 flex-1 flex-col">
              <StatsHeader />
              <AiDisabledBanner />
              <main className="flex-1 p-6">{children}</main>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  )
}
```

- [ ] **Step 8: Placeholder de `AiDisabledBanner` (se completa en Task 21) y Home mínima**

`src/components/AiDisabledBanner.tsx`:

```tsx
import { isAiEnabled } from '@/lib/ai/config'
export function AiDisabledBanner() {
  if (isAiEnabled()) return null
  return (
    <div className="px-6 py-2 text-sm" style={{ background: 'var(--warning)', color: '#1b1b2f' }}>
      Falta <code>OPENAI_API_KEY</code>. Las funciones de IA (generar ejercicios, corregir speaking) están
      desactivadas. Añádela en <code>.env.local</code> y reinicia.
    </div>
  )
}
```

`src/app/page.tsx` (temporal, se amplía en Task 20):

```tsx
export default function HomePage() {
  return <h1 className="text-2xl font-bold">Inicio</h1>
}
```

- [ ] **Step 9: `src/app/api/audio/[...path]/route.ts`**

```ts
import { NextRequest } from 'next/server'
import { readAudioFile } from '@/lib/storage'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params
  try {
    const buf = await readAudioFile(path.join('/'))
    const ext = path[path.length - 1].split('.').pop()
    return new Response(new Uint8Array(buf), {
      headers: { 'Content-Type': ext === 'mp3' ? 'audio/mpeg' : 'audio/webm' },
    })
  } catch {
    return new Response('No encontrado', { status: 404 })
  }
}
```

- [ ] **Step 10: Verificar**

Run: `npm run dev` y abrir `http://localhost:3000`
Expected: sidebar visible, cabecera con `0 días / 0 XP / Nivel 1`, toggle de tema funciona y persiste al recargar. `npm run build` sin errores.

- [ ] **Step 11: Commit**

```bash
git add -A && git commit -m "feat: shell de UI (sidebar, cabecera, tema, componentes base)"
```

---

## Task 14: Biblioteca — subir PDF, extraer texto, crear unidades

**Files:**
- Create: `src/lib/pdf.ts`, `src/lib/pdf.test.ts`
- Create: `src/lib/units.ts`, `src/lib/units.test.ts`
- Create: `src/app/api/books/route.ts`, `src/app/api/units/route.ts`
- Create: `src/app/library/page.tsx`, `src/app/library/[bookId]/page.tsx`
- Create: `src/components/library/UploadBookForm.tsx`, `src/components/library/AddUnitForm.tsx`
- Create: `test/fixtures/sample.pdf` (un PDF real de 2+ páginas con texto; generarlo en el Step 1)

**Interfaces:**
- Consumes: `unpdf`, `prisma`, `saveBookFile`.
- Produces:
  - `extractPdf(bytes: Uint8Array): Promise<{ pages: string[]; totalPages: number }>` — usa `extractText(pdf, { mergePages: false })`. Lanza `Error('PDF sin texto extraíble')` si todas las páginas quedan vacías tras `trim()`.
  - `sliceUnitText(pages: string[], startPage: number, endPage: number): string` — une `pages[startPage-1 .. endPage-1]` con `\n\n`. 1-indexado. Clampa a rango válido; lanza si `startPage > endPage` o `startPage < 1`.
  - `POST /api/books` (multipart `file`) → `{ id }` del `Book` | error 400.
  - `POST /api/units` (JSON `{ bookId, title, startPage, endPage, level? }`) → `{ id }` de la `Unit` | error 400.

- [ ] **Step 1: Generar el PDF de fixture**

```bash
mkdir -p test/fixtures
node -e "
const { PDFDocument, StandardFonts } = require('pdf-lib');
" 2>/dev/null || npm i -D pdf-lib
node -e "
const { PDFDocument, StandardFonts } = require('pdf-lib');
(async () => {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (const t of ['Page one about daily routines. He gets up at seven.', 'Page two about hobbies. She plays tennis on Sundays.']) {
    const p = doc.addPage([300, 200]);
    p.drawText(t, { x: 20, y: 150, size: 10, font, maxWidth: 260 });
  }
  require('fs').writeFileSync('test/fixtures/sample.pdf', await doc.save());
})();
"
```

(pdf-lib queda como devDependency; solo se usa para fixtures.)

- [ ] **Step 2: Tests de `pdf.ts` y `units.ts`**

`src/lib/pdf.test.ts`:

```ts
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
```

`src/lib/units.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { validateUnitInput } from './units'

describe('validateUnitInput', () => {
  const book = { pageCount: 10 }
  it('acepta un rango válido', () => {
    expect(validateUnitInput({ title: 'U1', startPage: 1, endPage: 4 }, book).ok).toBe(true)
  })
  it('rechaza título vacío', () => {
    expect(validateUnitInput({ title: '  ', startPage: 1, endPage: 2 }, book).ok).toBe(false)
  })
  it('rechaza endPage > pageCount', () => {
    expect(validateUnitInput({ title: 'U', startPage: 1, endPage: 11 }, book).ok).toBe(false)
  })
  it('rechaza startPage < 1', () => {
    expect(validateUnitInput({ title: 'U', startPage: 0, endPage: 2 }, book).ok).toBe(false)
  })
})
```

- [ ] **Step 3: Ejecutar y ver fallar; luego implementar `src/lib/pdf.ts`**

```ts
import { extractText, getDocumentProxy } from 'unpdf'

export async function extractPdf(
  bytes: Uint8Array,
): Promise<{ pages: string[]; totalPages: number }> {
  const pdf = await getDocumentProxy(bytes)
  const { text, totalPages } = await extractText(pdf, { mergePages: false })
  const pages = (text as string[]).map((t) => t.trim())
  if (pages.every((p) => p === '')) {
    throw new Error('PDF sin texto extraíble')
  }
  return { pages, totalPages }
}

export function sliceUnitText(pages: string[], startPage: number, endPage: number): string {
  if (startPage < 1 || startPage > endPage) {
    throw new Error('rango de páginas inválido')
  }
  const from = startPage - 1
  const to = Math.min(endPage, pages.length)
  return pages.slice(from, to).join('\n\n')
}
```

- [ ] **Step 4: Implementar `src/lib/units.ts`**

```ts
export function validateUnitInput(
  input: { title: string; startPage: number; endPage: number },
  book: { pageCount: number },
): { ok: true } | { ok: false; error: string } {
  if (!input.title.trim()) return { ok: false, error: 'El título es obligatorio' }
  if (!Number.isInteger(input.startPage) || input.startPage < 1)
    return { ok: false, error: 'Página de inicio inválida' }
  if (!Number.isInteger(input.endPage) || input.endPage < input.startPage)
    return { ok: false, error: 'Página final inválida' }
  if (input.endPage > book.pageCount)
    return { ok: false, error: `El libro tiene ${book.pageCount} páginas` }
  return { ok: true }
}
```

- [ ] **Step 5: Ejecutar y ver pasar**

Run: `npm test -- src/lib/pdf.test.ts src/lib/units.test.ts`
Expected: PASS.

- [ ] **Step 6: `src/app/api/books/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { saveBookFile } from '@/lib/storage'
import { extractPdf } from '@/lib/pdf'

const MAX_BYTES = 25 * 1024 * 1024

export async function POST(req: NextRequest) {
  const form = await req.formData()
  const file = form.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Falta el archivo' }, { status: 400 })
  }
  if (file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'El archivo debe ser un PDF' }, { status: 400 })
  }
  const bytes = Buffer.from(await file.arrayBuffer())
  if (bytes.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: 'El PDF supera los 25 MB' }, { status: 400 })
  }

  let extracted
  try {
    extracted = await extractPdf(new Uint8Array(bytes))
  } catch {
    return NextResponse.json(
      { error: 'Este PDF no tiene texto seleccionable, no puedo procesarlo' },
      { status: 400 },
    )
  }

  const { filename } = await saveBookFile(bytes, file.name)
  const book = await prisma.book.create({
    data: {
      title: file.name.replace(/\.pdf$/i, ''),
      filename,
      pageCount: extracted.totalPages,
      rawText: JSON.stringify(extracted.pages),
    },
  })
  return NextResponse.json({ id: book.id })
}
```

Nota de diseño: `Book.rawText` guarda el **array de páginas** como JSON (para poder recortar por página al crear unidades).

- [ ] **Step 7: `src/app/api/units/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { validateUnitInput } from '@/lib/units'
import { sliceUnitText } from '@/lib/pdf'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { bookId, title, startPage, endPage, level } = body ?? {}
  const book = await prisma.book.findUnique({ where: { id: bookId } })
  if (!book) return NextResponse.json({ error: 'Libro no encontrado' }, { status: 404 })

  const check = validateUnitInput({ title: String(title ?? ''), startPage, endPage }, book)
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 })

  const pages: string[] = JSON.parse(book.rawText)
  const unit = await prisma.unit.create({
    data: {
      bookId,
      title: String(title).trim(),
      startPage,
      endPage,
      level: level ? String(level) : null,
      extractedText: sliceUnitText(pages, startPage, endPage),
    },
  })
  return NextResponse.json({ id: unit.id })
}
```

- [ ] **Step 8: Páginas de biblioteca (código completo)**

`src/components/library/UploadBookForm.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'

export function UploadBookForm() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    const data = new FormData(e.currentTarget)
    const res = await fetch('/api/books', { method: 'POST', body: data })
    setBusy(false)
    if (!res.ok) {
      setError((await res.json()).error ?? 'Error al subir')
      return
    }
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="flex items-center gap-3">
      <input type="file" name="file" accept="application/pdf" required />
      <Button disabled={busy}>{busy ? 'Procesando…' : 'Subir PDF'}</Button>
      {error && <span style={{ color: 'var(--warning)' }}>{error}</span>}
    </form>
  )
}
```

`src/app/library/page.tsx`:

```tsx
import Link from 'next/link'
import { prisma } from '@/lib/db'
import { Card } from '@/components/ui/Card'
import { UploadBookForm } from '@/components/library/UploadBookForm'

export const dynamic = 'force-dynamic'

export default async function LibraryPage() {
  const books = await prisma.book.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { units: true } } },
  })
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Biblioteca</h1>
      <Card><UploadBookForm /></Card>
      <div className="grid grid-cols-2 gap-4">
        {books.map((b) => (
          <Link key={b.id} href={`/library/${b.id}`}>
            <Card>
              <div className="font-medium">{b.title}</div>
              <div className="text-sm" style={{ color: 'var(--muted)' }}>
                {b.pageCount} páginas · {b._count.units} unidades
              </div>
            </Card>
          </Link>
        ))}
        {books.length === 0 && <p style={{ color: 'var(--muted)' }}>Aún no has subido ningún libro.</p>}
      </div>
    </div>
  )
}
```

`src/components/library/AddUnitForm.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'

export function AddUnitForm({ bookId }: { bookId: string }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const f = new FormData(e.currentTarget)
    const res = await fetch('/api/units', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookId,
        title: f.get('title'),
        startPage: Number(f.get('startPage')),
        endPage: Number(f.get('endPage')),
        level: f.get('level') || undefined,
      }),
    })
    setBusy(false)
    if (!res.ok) return setError((await res.json()).error ?? 'Error')
    ;(e.target as HTMLFormElement).reset()
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
      <label className="text-sm">Título<br /><input name="title" required className="rounded border px-2 py-1" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }} /></label>
      <label className="text-sm">Pág. inicio<br /><input name="startPage" type="number" min={1} required className="w-24 rounded border px-2 py-1" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }} /></label>
      <label className="text-sm">Pág. fin<br /><input name="endPage" type="number" min={1} required className="w-24 rounded border px-2 py-1" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }} /></label>
      <label className="text-sm">Nivel (opcional)<br /><input name="level" placeholder="A2–B1" className="w-24 rounded border px-2 py-1" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }} /></label>
      <Button disabled={busy}>{busy ? 'Guardando…' : 'Añadir unidad'}</Button>
      {error && <span style={{ color: 'var(--warning)' }}>{error}</span>}
    </form>
  )
}
```

`src/app/library/[bookId]/page.tsx`:

```tsx
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { Card } from '@/components/ui/Card'
import { AddUnitForm } from '@/components/library/AddUnitForm'

export const dynamic = 'force-dynamic'

export default async function BookPage({ params }: { params: Promise<{ bookId: string }> }) {
  const { bookId } = await params
  const book = await prisma.book.findUnique({
    where: { id: bookId },
    include: { units: { orderBy: { startPage: 'asc' } } },
  })
  if (!book) notFound()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{book.title}</h1>
      <p style={{ color: 'var(--muted)' }}>{book.pageCount} páginas</p>
      <Card><AddUnitForm bookId={book.id} /></Card>
      <div className="space-y-3">
        {book.units.map((u) => (
          <Card key={u.id}>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{u.title}</div>
                <div className="text-sm" style={{ color: 'var(--muted)' }}>
                  Págs. {u.startPage}–{u.endPage}{u.level ? ` · ${u.level}` : ''}
                </div>
              </div>
              <div className="flex gap-2">
                <Link href={`/learn/${u.id}`} className="text-sm" style={{ color: 'var(--primary)' }}>Estudiar</Link>
                <Link href={`/speaking?unitId=${u.id}`} className="text-sm" style={{ color: 'var(--primary)' }}>Practicar speaking</Link>
              </div>
            </div>
          </Card>
        ))}
        {book.units.length === 0 && <p style={{ color: 'var(--muted)' }}>Aún no hay unidades.</p>}
      </div>
    </div>
  )
}
```

- [ ] **Step 9: Prueba manual**

Run: `npm run dev`, ir a `/library`, subir `test/fixtures/sample.pdf`, abrir el libro, crear la unidad "Rutinas" (págs. 1–2).
Expected: el libro aparece con "2 páginas · 1 unidades"; la unidad se lista con enlaces "Estudiar" y "Practicar speaking".

- [ ] **Step 10: `npm test` completo + `npm run build`**

Expected: verde.

- [ ] **Step 11: Commit**

```bash
git add -A && git commit -m "feat: biblioteca — subir PDF, extraer texto y crear unidades"
```

---

## Task 15: Aprender — lista de unidades y API de generación de ejercicios

**Files:**
- Create: `src/lib/exercise-types.ts`
- Create: `src/app/api/units/[id]/exercises/route.ts`
- Create: `src/app/learn/page.tsx`
- Create: `src/lib/exercises/exercise-set.ts`, `src/lib/exercises/exercise-set.test.ts`

**Interfaces:**
- Consumes: `generateExercises` (Task 11), `parseExerciseContent` (Task 8), `prisma`, `isAiEnabled`.
- Produces:
  - `EXERCISE_TABS: { type: ExerciseType; label: string }[]` — orden y etiquetas en español ("Opción múltiple", "Rellenar huecos", "Relacionar", "Ordenar frases", "Flashcards").
  - `isExerciseType(s: string): s is ExerciseType`
  - `POST /api/units/[id]/exercises?type=<T>&regenerate=<0|1>`:
    - Si `regenerate` no está y ya existe `ExerciseSet(unitId,type)` → devuelve `{ id, type, content }` desde DB.
    - Si no existe (o `regenerate=1`) y `!isAiEnabled()` → 503 `{ error: 'IA desactivada' }`.
    - Si genera: llama `generateExercises`, `upsert` en DB, marca `unit.lastOpenedAt = now`, devuelve `{ id, type, content }`.
    - Errores `AiError` → 502 `{ error: 'No se pudo generar el ejercicio, inténtalo de nuevo' }`.
  - `serializeSet(set)` / `deserializeSet(row)` helpers para el `JSON.stringify`/`parse` de `content`.

- [ ] **Step 1: `src/lib/exercise-types.ts`**

```ts
import type { ExerciseType } from '@prisma/client'

export const EXERCISE_TABS: { type: ExerciseType; label: string }[] = [
  { type: 'MULTIPLE_CHOICE', label: 'Opción múltiple' },
  { type: 'FILL_BLANKS', label: 'Rellenar huecos' },
  { type: 'MATCHING', label: 'Relacionar' },
  { type: 'ORDER_WORDS', label: 'Ordenar frases' },
  { type: 'FLASHCARDS', label: 'Flashcards' },
]

const SET = new Set(EXERCISE_TABS.map((t) => t.type))
export function isExerciseType(s: string): s is ExerciseType {
  return SET.has(s as ExerciseType)
}
```

- [ ] **Step 2: Test de helpers de (de)serialización**

`src/lib/exercises/exercise-set.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { deserializeContent, serializeContent } from './exercise-set'
import * as fx from '@/lib/validation/fixtures/exercises'

describe('serialize/deserialize', () => {
  it('ida y vuelta valida el contenido', () => {
    const s = serializeContent('FLASHCARDS', fx.flashcards)
    expect(typeof s).toBe('string')
    expect(deserializeContent('FLASHCARDS', s).items).toHaveLength(15)
  })
  it('deserialize lanza si el contenido guardado no valida', () => {
    expect(() => deserializeContent('MATCHING', '{"items":[]}')).toThrow()
  })
})
```

- [ ] **Step 3: Ejecutar y ver fallar; luego implementar `src/lib/exercises/exercise-set.ts`**

```ts
import type { ExerciseType } from '@prisma/client'
import { parseExerciseContent, type ExerciseContent } from '@/lib/validation/exercises'

export function serializeContent(type: ExerciseType, content: unknown): string {
  return JSON.stringify(parseExerciseContent(type, content))
}

export function deserializeContent(type: ExerciseType, raw: string): ExerciseContent {
  return parseExerciseContent(type, JSON.parse(raw))
}
```

- [ ] **Step 4: Ejecutar y ver pasar**

Run: `npm test -- src/lib/exercises/exercise-set.test.ts`
Expected: PASS.

- [ ] **Step 5: `src/app/api/units/[id]/exercises/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { isAiEnabled } from '@/lib/ai/config'
import { generateExercises, AiError } from '@/lib/ai'
import { isExerciseType } from '@/lib/exercise-types'
import { serializeContent, deserializeContent } from '@/lib/exercises/exercise-set'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const url = new URL(req.url)
  const type = url.searchParams.get('type') ?? ''
  const regenerate = url.searchParams.get('regenerate') === '1'
  if (!isExerciseType(type)) {
    return NextResponse.json({ error: 'Tipo de ejercicio inválido' }, { status: 400 })
  }

  const unit = await prisma.unit.findUnique({ where: { id } })
  if (!unit) return NextResponse.json({ error: 'Unidad no encontrada' }, { status: 404 })

  const existing = await prisma.exerciseSet.findUnique({
    where: { unitId_type: { unitId: id, type } },
  })
  if (existing && !regenerate) {
    return NextResponse.json({
      id: existing.id,
      type,
      content: deserializeContent(type, existing.content),
    })
  }

  if (!isAiEnabled()) {
    return NextResponse.json(
      { error: 'La IA está desactivada (falta OPENAI_API_KEY)' },
      { status: 503 },
    )
  }

  let serialized: string
  try {
    const content = await generateExercises(unit.extractedText, type)
    serialized = serializeContent(type, content)
  } catch (err) {
    if (err instanceof AiError) {
      return NextResponse.json(
        { error: 'No se pudo generar el ejercicio, inténtalo de nuevo' },
        { status: 502 },
      )
    }
    throw err
  }

  const set = await prisma.exerciseSet.upsert({
    where: { unitId_type: { unitId: id, type } },
    create: { unitId: id, type, content: serialized },
    update: { content: serialized, generatedAt: new Date() },
  })
  await prisma.unit.update({ where: { id }, data: { lastOpenedAt: new Date() } })

  return NextResponse.json({ id: set.id, type, content: deserializeContent(type, serialized) })
}
```

- [ ] **Step 6: `src/app/learn/page.tsx`**

```tsx
import Link from 'next/link'
import { prisma } from '@/lib/db'
import { Card } from '@/components/ui/Card'

export const dynamic = 'force-dynamic'

export default async function LearnPage() {
  const units = await prisma.unit.findMany({
    orderBy: { createdAt: 'desc' },
    include: { book: true },
  })
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Aprender</h1>
      {units.length === 0 && (
        <p style={{ color: 'var(--muted)' }}>
          No hay unidades. Ve a <Link href="/library" style={{ color: 'var(--primary)' }}>Biblioteca</Link> y crea una.
        </p>
      )}
      <div className="grid grid-cols-2 gap-4">
        {units.map((u) => (
          <Link key={u.id} href={`/learn/${u.id}`}>
            <Card>
              <div className="font-medium">{u.title}</div>
              <div className="text-sm" style={{ color: 'var(--muted)' }}>
                {u.book.title} · págs. {u.startPage}–{u.endPage}
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Prueba manual con IA (si hay API key) o verificación de 503**

Con `OPENAI_API_KEY` presente: `curl -XPOST 'http://localhost:3000/api/units/<unitId>/exercises?type=FLASHCARDS'` → JSON con 15 items; repetir → mismo `id` sin nueva llamada.
Sin API key: mismo `curl` → 503 con el mensaje de IA desactivada.

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat: API de generación/caché de ejercicios y lista de unidades"
```

---

## Task 16: Aprender — componentes de los 5 tipos de ejercicio y registro de intentos

**Files:**
- Create: `src/lib/exercises/shuffle.ts`, `src/lib/exercises/shuffle.test.ts`
- Create: `src/app/api/attempts/route.ts`
- Create: `src/app/learn/[unitId]/page.tsx`
- Create: `src/components/exercises/ExerciseRunner.tsx` (client, orquesta pestañas + carga)
- Create: `src/components/exercises/MultipleChoice.tsx`, `FillBlanks.tsx`, `Matching.tsx`, `OrderWords.tsx`, `Flashcards.tsx`

**Interfaces:**
- Consumes: `EXERCISE_TABS`, grading de Task 6, `xpForExercise` (Task 4), `recordActivity` (Task 7), tipos de contenido de Task 8.
- Produces:
  - `shuffle<T>(arr: T[], seed?: number): T[]` — Fisher-Yates determinista si `seed` dado (para tests).
  - `POST /api/attempts` (JSON `{ exerciseSetId, correctCount, totalCount, answers }`) →
    calcula `score` con la misma fórmula que `grade.ts` (`round(correctCount/totalCount*100)`, 0 si total 0),
    `xpEarned = xpForExercise(set.type, correctCount)`, crea `ExerciseAttempt`, llama `recordActivity({ xp: xpEarned })`,
    devuelve `{ score, xpEarned }`.
  - Cada componente de ejercicio recibe `content` tipado + `onFinish(result: { correctCount; totalCount; answers: unknown })`.
  - `Flashcards` llama `onFinish` con `correctCount: 0, totalCount: 0` (XP fijo de 5 vía `xpForExercise`).

- [ ] **Step 1: Test + implementación de `shuffle`**

`src/lib/exercises/shuffle.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { shuffle } from './shuffle'

describe('shuffle', () => {
  it('conserva todos los elementos', () => {
    const out = shuffle([1, 2, 3, 4, 5], 42)
    expect([...out].sort()).toEqual([1, 2, 3, 4, 5])
  })
  it('es determinista con la misma semilla', () => {
    expect(shuffle([1, 2, 3, 4, 5], 7)).toEqual(shuffle([1, 2, 3, 4, 5], 7))
  })
  it('no muta el array original', () => {
    const src = [1, 2, 3]
    shuffle(src, 1)
    expect(src).toEqual([1, 2, 3])
  })
})
```

`src/lib/exercises/shuffle.ts`:

```ts
export function shuffle<T>(arr: T[], seed?: number): T[] {
  const out = [...arr]
  let s = seed ?? Math.floor(Math.random() * 2 ** 31)
  const rand = () => {
    s = (s * 1664525 + 1013904223) % 2 ** 32
    return s / 2 ** 32
  }
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}
```

Run: `npm test -- src/lib/exercises/shuffle.test.ts` → PASS.

- [ ] **Step 2: `src/app/api/attempts/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { xpForExercise } from '@/lib/gamification/xp'
import { recordActivity } from '@/lib/profile'

export async function POST(req: NextRequest) {
  const { exerciseSetId, correctCount, totalCount, answers } = await req.json()
  const set = await prisma.exerciseSet.findUnique({ where: { id: exerciseSetId } })
  if (!set) return NextResponse.json({ error: 'Set no encontrado' }, { status: 404 })

  const cc = Math.max(0, Number(correctCount) || 0)
  const tc = Math.max(0, Number(totalCount) || 0)
  const score = tc === 0 ? 0 : Math.round((cc / tc) * 100)
  const xpEarned = xpForExercise(set.type, cc)

  await prisma.exerciseAttempt.create({
    data: {
      exerciseSetId,
      score,
      correctCount: cc,
      totalCount: tc,
      xpEarned,
      answers: JSON.stringify(answers ?? null),
    },
  })
  await recordActivity({ xp: xpEarned })
  return NextResponse.json({ score, xpEarned })
}
```

- [ ] **Step 3: Componentes de ejercicio (código completo)**

`src/components/exercises/MultipleChoice.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { gradeMultipleChoice } from '@/lib/exercises/grade'
import type { MultipleChoiceContent } from '@/lib/validation/exercises'

export function MultipleChoice({
  content,
  onFinish,
}: {
  content: MultipleChoiceContent
  onFinish: (r: { correctCount: number; totalCount: number; answers: unknown }) => void
}) {
  const [answers, setAnswers] = useState<(number | null)[]>(content.items.map(() => null))
  const [done, setDone] = useState(false)

  function submit() {
    setDone(true)
    const g = gradeMultipleChoice(answers, content.items)
    onFinish({ correctCount: g.correctCount, totalCount: g.totalCount, answers })
  }

  return (
    <div className="space-y-5">
      {content.items.map((q, i) => (
        <div key={i}>
          <p className="font-medium">{i + 1}. {q.question}</p>
          <div className="mt-2 space-y-1">
            {q.options.map((opt, j) => {
              const chosen = answers[i] === j
              const showRight = done && j === q.correctIndex
              const showWrong = done && chosen && j !== q.correctIndex
              return (
                <label
                  key={j}
                  className="block cursor-pointer rounded-lg border px-3 py-2 text-sm"
                  style={{
                    borderColor: showRight ? 'var(--success)' : showWrong ? 'var(--warning)' : 'var(--border)',
                    background: chosen ? 'var(--bg)' : 'transparent',
                  }}
                >
                  <input
                    type="radio"
                    name={`q${i}`}
                    className="mr-2"
                    disabled={done}
                    checked={chosen}
                    onChange={() => setAnswers((a) => a.map((v, k) => (k === i ? j : v)))}
                  />
                  {opt}
                </label>
              )
            })}
          </div>
          {done && <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>{q.explanation}</p>}
        </div>
      ))}
      {!done && <Button onClick={submit}>Comprobar</Button>}
    </div>
  )
}
```

`src/components/exercises/FillBlanks.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { gradeFillBlanks } from '@/lib/exercises/grade'
import { isFillBlankCorrect } from '@/lib/exercises/normalize'
import type { FillBlanksContent } from '@/lib/validation/exercises'

export function FillBlanks({ content, onFinish }: {
  content: FillBlanksContent
  onFinish: (r: { correctCount: number; totalCount: number; answers: unknown }) => void
}) {
  const [answers, setAnswers] = useState<string[]>(content.items.map(() => ''))
  const [done, setDone] = useState(false)

  function submit() {
    setDone(true)
    const g = gradeFillBlanks(answers, content.items)
    onFinish({ correctCount: g.correctCount, totalCount: g.totalCount, answers })
  }

  return (
    <div className="space-y-4">
      {content.items.map((it, i) => {
        const ok = done && isFillBlankCorrect(answers[i], it.answer, it.acceptedVariants)
        const [before, after] = it.sentence.split('___')
        return (
          <div key={i} className="text-sm">
            {before}
            <input
              disabled={done}
              value={answers[i]}
              onChange={(e) => setAnswers((a) => a.map((v, k) => (k === i ? e.target.value : v)))}
              className="mx-1 rounded border px-2 py-1"
              style={{ borderColor: done ? (ok ? 'var(--success)' : 'var(--warning)') : 'var(--border)', background: 'var(--bg)' }}
            />
            {after}
            {done && !ok && <span className="ml-2" style={{ color: 'var(--muted)' }}>→ {it.answer}</span>}
          </div>
        )
      })}
      {!done && <Button onClick={submit}>Comprobar</Button>}
    </div>
  )
}
```

`src/components/exercises/Matching.tsx`:

```tsx
'use client'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { gradeMatching } from '@/lib/exercises/grade'
import { shuffle } from '@/lib/exercises/shuffle'
import type { MatchingContent } from '@/lib/validation/exercises'

export function Matching({ content, onFinish }: {
  content: MatchingContent
  onFinish: (r: { correctCount: number; totalCount: number; answers: unknown }) => void
}) {
  // rightOrder[k] = índice original del par mostrado en la posición k del desplegable
  const rightOrder = useMemo(() => shuffle(content.items.map((_, i) => i), 1234), [content])
  const [picks, setPicks] = useState<Record<number, number>>({})
  const [done, setDone] = useState(false)

  function submit() {
    setDone(true)
    const g = gradeMatching(picks, content.items.length)
    onFinish({ correctCount: g.correctCount, totalCount: g.totalCount, answers: picks })
  }

  return (
    <div className="space-y-3">
      {content.items.map((it, i) => (
        <div key={i} className="flex items-center gap-3 text-sm">
          <span className="w-40 font-medium">{it.left}</span>
          <select
            disabled={done}
            value={picks[i] ?? ''}
            onChange={(e) => setPicks((p) => ({ ...p, [i]: Number(e.target.value) }))}
            className="rounded border px-2 py-1"
            style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}
          >
            <option value="">—</option>
            {rightOrder.map((origIdx) => (
              <option key={origIdx} value={origIdx}>{content.items[origIdx].right}</option>
            ))}
          </select>
          {done && (picks[i] === i ? '✅' : `❌ ${it.right}`)}
        </div>
      ))}
      {!done && <Button onClick={submit}>Comprobar</Button>}
    </div>
  )
}
```

`src/components/exercises/OrderWords.tsx`:

```tsx
'use client'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { gradeOrderWords } from '@/lib/exercises/grade'
import type { OrderWordsContent } from '@/lib/validation/exercises'

export function OrderWords({ content, onFinish }: {
  content: OrderWordsContent
  onFinish: (r: { correctCount: number; totalCount: number; answers: unknown }) => void
}) {
  const initial = useMemo(() => content.items.map((it) => [...it.scrambled]), [content])
  const [arrangements, setArrangements] = useState<string[][]>(initial)
  const [done, setDone] = useState(false)

  function move(itemIdx: number, from: number, to: number) {
    setArrangements((prev) =>
      prev.map((row, k) => {
        if (k !== itemIdx || to < 0 || to >= row.length) return row
        const copy = [...row]
        ;[copy[from], copy[to]] = [copy[to], copy[from]]
        return copy
      }),
    )
  }

  function submit() {
    setDone(true)
    const g = gradeOrderWords(arrangements, content.items)
    onFinish({ correctCount: g.correctCount, totalCount: g.totalCount, answers: arrangements })
  }

  return (
    <div className="space-y-4">
      {arrangements.map((row, i) => {
        const ok = done && row.join(' ') === content.items[i].correctOrder.join(' ')
        return (
          <div key={i} className="flex flex-wrap items-center gap-1 text-sm">
            {row.map((w, j) => (
              <span key={j} className="inline-flex items-center gap-1 rounded border px-2 py-1" style={{ borderColor: 'var(--border)' }}>
                {!done && <button onClick={() => move(i, j, j - 1)}>◀</button>}
                {w}
                {!done && <button onClick={() => move(i, j, j + 1)}>▶</button>}
              </span>
            ))}
            {done && <span className="ml-2">{ok ? '✅' : `→ ${content.items[i].correctOrder.join(' ')}`}</span>}
          </div>
        )
      })}
      {!done && <Button onClick={submit}>Comprobar</Button>}
    </div>
  )
}
```

`src/components/exercises/Flashcards.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import type { FlashcardsContent } from '@/lib/validation/exercises'

export function Flashcards({ content, onFinish }: {
  content: FlashcardsContent
  onFinish: (r: { correctCount: number; totalCount: number; answers: unknown }) => void
}) {
  const [i, setI] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [known, setKnown] = useState<boolean[]>([])
  const card = content.items[i]
  const last = i === content.items.length - 1

  function mark(k: boolean) {
    const next = [...known, k]
    setKnown(next)
    if (last) {
      onFinish({ correctCount: 0, totalCount: 0, answers: next })
    } else {
      setI(i + 1)
      setFlipped(false)
    }
  }

  return (
    <div className="space-y-4">
      <div
        onClick={() => setFlipped((f) => !f)}
        className="flex h-40 cursor-pointer items-center justify-center rounded-2xl border text-lg"
        style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
      >
        {flipped ? card.back : card.front}
      </div>
      <div className="text-sm" style={{ color: 'var(--muted)' }}>Tarjeta {i + 1} / {content.items.length}</div>
      <div className="flex gap-2">
        <Button variant="ghost" onClick={() => mark(false)}>No la sabía</Button>
        <Button onClick={() => mark(true)}>La sabía</Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: `src/components/exercises/ExerciseRunner.tsx`**

```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Tabs } from '@/components/ui/Tabs'
import { Card } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { Button } from '@/components/ui/Button'
import { EXERCISE_TABS } from '@/lib/exercise-types'
import type { ExerciseType } from '@prisma/client'
import { MultipleChoice } from './MultipleChoice'
import { FillBlanks } from './FillBlanks'
import { Matching } from './Matching'
import { OrderWords } from './OrderWords'
import { Flashcards } from './Flashcards'

export function ExerciseRunner({ unitId }: { unitId: string }) {
  const router = useRouter()
  const [active, setActive] = useState<ExerciseType>('MULTIPLE_CHOICE')
  const [state, setState] = useState<
    { status: 'idle' | 'loading' | 'error'; message?: string } | { status: 'ready'; setId: string; content: any }
  >({ status: 'idle' })
  const [result, setResult] = useState<{ score: number; xpEarned: number } | null>(null)

  async function load(type: ExerciseType, regenerate = false) {
    setActive(type)
    setResult(null)
    setState({ status: 'loading' })
    const res = await fetch(`/api/units/${unitId}/exercises?type=${type}${regenerate ? '&regenerate=1' : ''}`, {
      method: 'POST',
    })
    if (!res.ok) {
      setState({ status: 'error', message: (await res.json()).error ?? 'Error' })
      return
    }
    const data = await res.json()
    setState({ status: 'ready', setId: data.id, content: data.content })
  }

  async function finish(setId: string, r: { correctCount: number; totalCount: number; answers: unknown }) {
    const res = await fetch('/api/attempts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exerciseSetId: setId, ...r }),
    })
    if (res.ok) {
      setResult(await res.json())
      router.refresh() // actualiza la cabecera de XP/racha
    }
  }

  return (
    <div className="space-y-4">
      <Tabs
        tabs={EXERCISE_TABS.map((t) => ({ id: t.type, label: t.label }))}
        active={active}
        onChange={(id) => load(id as ExerciseType)}
      />
      <Card>
        {state.status === 'idle' && <p style={{ color: 'var(--muted)' }}>Elige una pestaña para empezar.</p>}
        {state.status === 'loading' && <Spinner label="Generando ejercicio…" />}
        {state.status === 'error' && (
          <div className="space-y-2">
            <p style={{ color: 'var(--warning)' }}>{state.message}</p>
            <Button onClick={() => load(active)}>Reintentar</Button>
          </div>
        )}
        {state.status === 'ready' && (
          <div className="space-y-4">
            {result ? (
              <div className="space-y-2">
                <p className="font-medium">Puntuación: {result.score}% · +{result.xpEarned} XP</p>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => load(active, true)}>Regenerar</Button>
                  <Button onClick={() => load(active)}>Repetir</Button>
                </div>
              </div>
            ) : (
              <>
                {active === 'MULTIPLE_CHOICE' && <MultipleChoice content={state.content} onFinish={(r) => finish(state.setId, r)} />}
                {active === 'FILL_BLANKS' && <FillBlanks content={state.content} onFinish={(r) => finish(state.setId, r)} />}
                {active === 'MATCHING' && <Matching content={state.content} onFinish={(r) => finish(state.setId, r)} />}
                {active === 'ORDER_WORDS' && <OrderWords content={state.content} onFinish={(r) => finish(state.setId, r)} />}
                {active === 'FLASHCARDS' && <Flashcards content={state.content} onFinish={(r) => finish(state.setId, r)} />}
                <button className="text-xs" style={{ color: 'var(--muted)' }} onClick={() => load(active, true)}>
                  Regenerar este ejercicio
                </button>
              </>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}
```

- [ ] **Step 5: `src/app/learn/[unitId]/page.tsx`**

```tsx
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/db'
import { ExerciseRunner } from '@/components/exercises/ExerciseRunner'

export const dynamic = 'force-dynamic'

export default async function UnitLearnPage({ params }: { params: Promise<{ unitId: string }> }) {
  const { unitId } = await params
  const unit = await prisma.unit.findUnique({ where: { id: unitId }, include: { book: true } })
  if (!unit) notFound()
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{unit.title}</h1>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          {unit.book.title} · <Link href={`/speaking?unitId=${unit.id}`} style={{ color: 'var(--primary)' }}>practicar speaking</Link>
        </p>
      </div>
      <ExerciseRunner unitId={unit.id} />
    </div>
  )
}
```

- [ ] **Step 6: `npm test` + `npm run build`**

Expected: verde.

- [ ] **Step 7: Prueba manual (requiere API key)**

En `/learn/<unitId>`: abrir cada pestaña genera el ejercicio; completar opción múltiple muestra "Puntuación X% · +Y XP" y la cabecera sube el XP; recargar la pestaña sirve el mismo ejercicio sin spinner largo; "Regenerar" produce uno nuevo.

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat: 5 tipos de ejercicio, runner y registro de intentos con XP"
```

---

## Task 17: Speaking — inicio de sesión (guiado y monólogo)

**Files:**
- Create: `src/lib/speaking/session.ts`, `src/lib/speaking/session.test.ts`
- Create: `src/app/api/speaking/sessions/route.ts`
- Create: `src/app/speaking/page.tsx`
- Create: `src/components/speaking/StartSessionForm.tsx`

**Interfaces:**
- Consumes: `generateGuidedOpener`, `synthesizeSpeech` (Task 11), `saveAudioFile` (Task 12), `prisma`, `isAiEnabled`.
- Produces:
  - `resolveTopic(input: { mode; unitTitle?: string | null; customTopic?: string | null }): string` — guiado con unidad → el título de la unidad; guiado sin unidad o monólogo → `customTopic` (obligatorio, no vacío). Lanza si falta.
  - `totalTurnsForMode(mode): number` — `GUIDED` → 5, `MONOLOGUE` → 1.
  - `POST /api/speaking/sessions` (JSON `{ mode: 'GUIDED'|'MONOLOGUE', unitId?: string, topic?: string }`):
    - valida `mode`; resuelve `topic`.
    - Si `mode === 'GUIDED'`: requiere IA (503 si no); `generateGuidedOpener(topic)`, `synthesizeSpeech` del opener → guarda audio. Crea `SpeakingSession` + primer `SpeakingTurn` (`index: 1`, `assistantPrompt`, `assistantAudioPath`).
    - Si `mode === 'MONOLOGUE'`: no llama a IA. Crea `SpeakingSession` + `SpeakingTurn` (`index: 1`, `assistantPrompt: topic`, `assistantAudioPath: null`).
    - Responde `{ id }` de la sesión.
    - `AiError` → 502.

- [ ] **Step 1: Tests de `session.ts`**

`src/lib/speaking/session.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { resolveTopic, totalTurnsForMode } from './session'

describe('totalTurnsForMode', () => {
  it('guiado 5, monólogo 1', () => {
    expect(totalTurnsForMode('GUIDED')).toBe(5)
    expect(totalTurnsForMode('MONOLOGUE')).toBe(1)
  })
})

describe('resolveTopic', () => {
  it('guiado con unidad usa el título de la unidad', () => {
    expect(resolveTopic({ mode: 'GUIDED', unitTitle: 'Daily routines' })).toBe('Daily routines')
  })
  it('guiado sin unidad usa el tema escrito', () => {
    expect(resolveTopic({ mode: 'GUIDED', customTopic: 'My last trip' })).toBe('My last trip')
  })
  it('monólogo exige tema escrito', () => {
    expect(() => resolveTopic({ mode: 'MONOLOGUE', customTopic: '  ' })).toThrow()
    expect(resolveTopic({ mode: 'MONOLOGUE', customTopic: 'Hobbies' })).toBe('Hobbies')
  })
})
```

- [ ] **Step 2: Ejecutar y ver fallar; luego implementar `src/lib/speaking/session.ts`**

```ts
import type { SpeakingMode } from '@prisma/client'

export function totalTurnsForMode(mode: SpeakingMode): number {
  return mode === 'GUIDED' ? 5 : 1
}

export function resolveTopic(input: {
  mode: SpeakingMode
  unitTitle?: string | null
  customTopic?: string | null
}): string {
  if (input.mode === 'GUIDED' && input.unitTitle?.trim()) {
    return input.unitTitle.trim()
  }
  const custom = input.customTopic?.trim()
  if (!custom) throw new Error('Escribe un tema para la sesión')
  return custom
}
```

Run: `npm test -- src/lib/speaking/session.test.ts` → PASS.

- [ ] **Step 3: `src/app/api/speaking/sessions/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { isAiEnabled } from '@/lib/ai/config'
import { generateGuidedOpener, synthesizeSpeech, AiError } from '@/lib/ai'
import { saveAudioFile } from '@/lib/storage'
import { resolveTopic, totalTurnsForMode } from '@/lib/speaking/session'

export async function POST(req: NextRequest) {
  const { mode, unitId, topic: customTopic } = await req.json()
  if (mode !== 'GUIDED' && mode !== 'MONOLOGUE') {
    return NextResponse.json({ error: 'Modo inválido' }, { status: 400 })
  }

  const unit = unitId ? await prisma.unit.findUnique({ where: { id: unitId } }) : null

  let topic: string
  try {
    topic = resolveTopic({ mode, unitTitle: unit?.title, customTopic })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }

  const totalTurns = totalTurnsForMode(mode)

  let firstPrompt = topic
  let firstAudio: string | null = null

  if (mode === 'GUIDED') {
    if (!isAiEnabled()) {
      return NextResponse.json({ error: 'La IA está desactivada (falta OPENAI_API_KEY)' }, { status: 503 })
    }
    try {
      firstPrompt = await generateGuidedOpener(topic)
      firstAudio = await saveAudioFile(await synthesizeSpeech(firstPrompt), 'mp3')
    } catch (err) {
      if (err instanceof AiError) {
        return NextResponse.json({ error: 'No se pudo iniciar la sesión, inténtalo de nuevo' }, { status: 502 })
      }
      throw err
    }
  }

  const session = await prisma.speakingSession.create({
    data: {
      mode,
      unitId: unit?.id ?? null,
      topic,
      totalTurns,
      turns: {
        create: { index: 1, assistantPrompt: firstPrompt, assistantAudioPath: firstAudio },
      },
    },
  })
  return NextResponse.json({ id: session.id })
}
```

- [ ] **Step 4: `src/components/speaking/StartSessionForm.tsx`**

```tsx
'use client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

export function StartSessionForm({ units }: { units: { id: string; title: string }[] }) {
  const router = useRouter()
  const preUnit = useSearchParams().get('unitId') ?? ''
  const [mode, setMode] = useState<'GUIDED' | 'MONOLOGUE'>('GUIDED')
  const [unitId, setUnitId] = useState(preUnit)
  const [topic, setTopic] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function start() {
    setBusy(true)
    setError(null)
    const res = await fetch('/api/speaking/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode,
        unitId: mode === 'GUIDED' && unitId ? unitId : undefined,
        topic: topic || undefined,
      }),
    })
    setBusy(false)
    if (!res.ok) return setError((await res.json()).error ?? 'Error')
    router.push(`/speaking/${(await res.json()).id}`)
  }

  return (
    <Card>
      <div className="space-y-4">
        <div className="flex gap-2">
          <Button variant={mode === 'GUIDED' ? 'primary' : 'ghost'} onClick={() => setMode('GUIDED')}>Conversación guiada</Button>
          <Button variant={mode === 'MONOLOGUE' ? 'primary' : 'ghost'} onClick={() => setMode('MONOLOGUE')}>Monólogo libre</Button>
        </div>

        {mode === 'GUIDED' && (
          <label className="block text-sm">
            Unidad (opcional)<br />
            <select value={unitId} onChange={(e) => setUnitId(e.target.value)} className="rounded border px-2 py-1" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
              <option value="">— Tema libre —</option>
              {units.map((u) => <option key={u.id} value={u.id}>{u.title}</option>)}
            </select>
          </label>
        )}

        {(mode === 'MONOLOGUE' || !unitId) && (
          <label className="block text-sm">
            Tema {mode === 'MONOLOGUE' ? '(obligatorio)' : '(si no eliges unidad)'}<br />
            <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="My last trip" className="w-72 rounded border px-2 py-1" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }} />
          </label>
        )}

        <p className="text-xs" style={{ color: 'var(--muted)' }}>
          {mode === 'GUIDED' ? '5 turnos. La IA responde y sigue la conversación.' : '1 turno. La IA solo corrige lo que digas.'}
        </p>

        <Button onClick={start} disabled={busy}>{busy ? 'Iniciando…' : 'Empezar'}</Button>
        {error && <p style={{ color: 'var(--warning)' }}>{error}</p>}
      </div>
    </Card>
  )
}
```

- [ ] **Step 5: `src/app/speaking/page.tsx`**

```tsx
import { Suspense } from 'react'
import { prisma } from '@/lib/db'
import { StartSessionForm } from '@/components/speaking/StartSessionForm'

export const dynamic = 'force-dynamic'

export default async function SpeakingPage() {
  const units = await prisma.unit.findMany({ orderBy: { createdAt: 'desc' }, select: { id: true, title: true } })
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Practicar speaking</h1>
      <Suspense>
        <StartSessionForm units={units} />
      </Suspense>
    </div>
  )
}
```

- [ ] **Step 6: `npm test` + `npm run build`**

Expected: verde.

- [ ] **Step 7: Prueba manual**

- Monólogo con tema "Hobbies" (sin API key también funciona) → redirige a `/speaking/<id>`; en DB hay `SpeakingSession(mode=MONOLOGUE, totalTurns=1)` y un `SpeakingTurn(index=1, assistantPrompt='Hobbies')`.
- Guiado (con API key) → sesión con `totalTurns=5` y primer turno con `assistantPrompt` + `assistantAudioPath`.

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat: inicio de sesión de speaking (guiado y monólogo)"
```

---

## Task 18: Speaking — grabador, tubería de turno y pantalla de turno

**Files:**
- Create: `src/lib/speaking/turn.ts`, `src/lib/speaking/turn.test.ts`
- Create: `src/app/api/speaking/sessions/[id]/turns/route.ts`
- Create: `src/components/speaking/AudioRecorder.tsx`
- Create: `src/components/speaking/TurnView.tsx`, `src/components/speaking/TurnFeedback.tsx`, `src/components/speaking/TurnTabs.tsx`
- Create: `src/app/speaking/[sessionId]/page.tsx`

**Interfaces:**
- Consumes: `transcribe`, `reviewSpeakingTurn`, `synthesizeSpeech`, `AiError` (Task 11), `saveAudioFile` (Task 12), `recordActivity` (Task 7), `XP_PER_SPEAKING_TURN` (Task 4).
- Produces:
  - `buildHistory(turns): { role: 'assistant' | 'user'; text: string }[]` — de los turnos ya guardados, alterna `assistant` (`assistantPrompt`) y `user` (`userTranscript`), en orden de `index`, omitiendo transcripts nulos.
  - `nextTurnIndex(turns): number` — `max(index) + 1`.
  - `isSessionComplete(session, savedTurnCount): boolean` — `savedTurnCount >= session.totalTurns`.
  - `POST /api/speaking/sessions/[id]/turns` (multipart: `audio` blob). Para el turno abierto (el de mayor `index` sin `userTranscript`):
    1. `saveAudioFile(audio, 'webm')` → `userAudioPath`.
    2. `transcribe` → `userTranscript`.
    3. `reviewSpeakingTurn({ transcript, topic, mode, turnIndex, totalTurns, history })`.
    4. `synthesizeSpeech(correctedText)` → `correctionAudioPath`.
    5. Si `review.nextAssistantPrompt` no es null: `synthesizeSpeech` de ese prompt → nuevo `SpeakingTurn(index+1, assistantPrompt, assistantAudioPath)`.
    6. Actualiza el turno abierto con transcript/corrección/audios.
    7. `recordActivity({ xp: XP_PER_SPEAKING_TURN })`, suma a `session.xpEarned`.
    8. Si tras esto el nº de turnos con transcript == `totalTurns` → `session.status = COMPLETED`.
    - Requiere IA: si `!isAiEnabled()` → 503.
    - `AiError` en cualquier paso → 502 y **no** se persiste nada del turno (se hace todo el trabajo de IA antes de escribir en DB; el `userAudioPath` guardado en disco es inocuo).
    - Respuesta: `{ turn: {...}, sessionStatus, xpEarned }`.

- [ ] **Step 1: Tests de `turn.ts`**

`src/lib/speaking/turn.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { buildHistory, nextTurnIndex, isSessionComplete } from './turn'

const turns = [
  { index: 1, assistantPrompt: 'Q1', userTranscript: 'A1' },
  { index: 2, assistantPrompt: 'Q2', userTranscript: null },
]

describe('buildHistory', () => {
  it('alterna assistant/user y omite transcripts nulos', () => {
    expect(buildHistory(turns)).toEqual([
      { role: 'assistant', text: 'Q1' },
      { role: 'user', text: 'A1' },
      { role: 'assistant', text: 'Q2' },
    ])
  })
})

describe('nextTurnIndex', () => {
  it('es max(index)+1', () => {
    expect(nextTurnIndex(turns)).toBe(3)
  })
})

describe('isSessionComplete', () => {
  it('true cuando los turnos guardados alcanzan totalTurns', () => {
    expect(isSessionComplete({ totalTurns: 5 }, 5)).toBe(true)
    expect(isSessionComplete({ totalTurns: 5 }, 4)).toBe(false)
    expect(isSessionComplete({ totalTurns: 1 }, 1)).toBe(true)
  })
})
```

- [ ] **Step 2: Ejecutar y ver fallar; luego implementar `src/lib/speaking/turn.ts`**

```ts
type TurnLike = { index: number; assistantPrompt: string; userTranscript: string | null }

export function buildHistory(turns: TurnLike[]): { role: 'assistant' | 'user'; text: string }[] {
  const out: { role: 'assistant' | 'user'; text: string }[] = []
  for (const t of [...turns].sort((a, b) => a.index - b.index)) {
    out.push({ role: 'assistant', text: t.assistantPrompt })
    if (t.userTranscript) out.push({ role: 'user', text: t.userTranscript })
  }
  return out
}

export function nextTurnIndex(turns: { index: number }[]): number {
  return Math.max(0, ...turns.map((t) => t.index)) + 1
}

export function isSessionComplete(session: { totalTurns: number }, savedTurnCount: number): boolean {
  return savedTurnCount >= session.totalTurns
}
```

Run: `npm test -- src/lib/speaking/turn.test.ts` → PASS.

- [ ] **Step 3: `src/app/api/speaking/sessions/[id]/turns/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { isAiEnabled } from '@/lib/ai/config'
import { transcribe, reviewSpeakingTurn, synthesizeSpeech, AiError } from '@/lib/ai'
import { saveAudioFile } from '@/lib/storage'
import { recordActivity } from '@/lib/profile'
import { XP_PER_SPEAKING_TURN } from '@/lib/gamification/xp'
import { buildHistory, isSessionComplete } from '@/lib/speaking/turn'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!isAiEnabled()) {
    return NextResponse.json({ error: 'La IA está desactivada (falta OPENAI_API_KEY)' }, { status: 503 })
  }

  const session = await prisma.speakingSession.findUnique({
    where: { id },
    include: { turns: { orderBy: { index: 'asc' } } },
  })
  if (!session) return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 })
  if (session.status === 'COMPLETED') {
    return NextResponse.json({ error: 'La sesión ya terminó' }, { status: 400 })
  }

  const open = session.turns.find((t) => !t.userTranscript)
  if (!open) return NextResponse.json({ error: 'No hay turno abierto' }, { status: 400 })

  const form = await req.formData()
  const audio = form.get('audio')
  if (!(audio instanceof File)) {
    return NextResponse.json({ error: 'Falta el audio' }, { status: 400 })
  }
  const bytes = Buffer.from(await audio.arrayBuffer())

  // Todo el trabajo de IA ocurre antes de escribir en DB.
  let userAudioPath: string
  let transcript: string
  let review
  let correctionAudioPath: string
  let nextAudioPath: string | null = null
  try {
    userAudioPath = await saveAudioFile(bytes, 'webm')
    transcript = await transcribe(bytes)
    review = await reviewSpeakingTurn({
      transcript,
      topic: session.topic,
      mode: session.mode,
      turnIndex: open.index,
      totalTurns: session.totalTurns,
      history: buildHistory(session.turns),
    })
    correctionAudioPath = await saveAudioFile(await synthesizeSpeech(review.correctedText), 'mp3')
    if (review.nextAssistantPrompt) {
      nextAudioPath = await saveAudioFile(await synthesizeSpeech(review.nextAssistantPrompt), 'mp3')
    }
  } catch (err) {
    if (err instanceof AiError) {
      return NextResponse.json({ error: 'No se pudo procesar el turno, inténtalo de nuevo' }, { status: 502 })
    }
    throw err
  }

  const savedCount = session.turns.filter((t) => t.userTranscript).length + 1
  const complete = isSessionComplete(session, savedCount)

  const updatedTurn = await prisma.$transaction(async (tx) => {
    const turn = await tx.speakingTurn.update({
      where: { id: open.id },
      data: {
        userAudioPath,
        userTranscript: transcript,
        correctedText: review.correctedText,
        naturalVersion: review.naturalVersion,
        fluencyTip: review.fluencyTip,
        correctionAudioPath,
      },
    })
    if (review.nextAssistantPrompt) {
      await tx.speakingTurn.create({
        data: {
          sessionId: session.id,
          index: open.index + 1,
          assistantPrompt: review.nextAssistantPrompt,
          assistantAudioPath: nextAudioPath,
        },
      })
    }
    await tx.speakingSession.update({
      where: { id: session.id },
      data: {
        xpEarned: session.xpEarned + XP_PER_SPEAKING_TURN,
        status: complete ? 'COMPLETED' : 'IN_PROGRESS',
      },
    })
    return turn
  })

  await recordActivity({ xp: XP_PER_SPEAKING_TURN })

  return NextResponse.json({
    turn: {
      ...updatedTurn,
      nextAssistantPrompt: review.nextAssistantPrompt,
    },
    sessionStatus: complete ? 'COMPLETED' : 'IN_PROGRESS',
    xpEarned: XP_PER_SPEAKING_TURN,
  })
}
```

- [ ] **Step 4: `src/components/speaking/AudioRecorder.tsx`**

```tsx
'use client'
import { useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'

export function AudioRecorder({
  onSubmit,
  disabled,
}: {
  onSubmit: (blob: Blob) => void
  disabled?: boolean
}) {
  const [state, setState] = useState<'idle' | 'recording' | 'recorded'>('idle')
  const [url, setUrl] = useState<string | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const blobRef = useRef<Blob | null>(null)

  async function start() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const rec = new MediaRecorder(stream, { mimeType: 'audio/webm' })
    chunksRef.current = []
    rec.ondataavailable = (e) => chunksRef.current.push(e.data)
    rec.onstop = () => {
      stream.getTracks().forEach((t) => t.stop())
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
      blobRef.current = blob
      setUrl(URL.createObjectURL(blob))
      setState('recorded')
    }
    recorderRef.current = rec
    rec.start()
    setState('recording')
  }

  function stop() {
    recorderRef.current?.stop()
  }

  return (
    <div className="space-y-3">
      {state === 'idle' && <Button onClick={start} disabled={disabled}>Grabar respuesta</Button>}
      {state === 'recording' && <Button variant="ghost" onClick={stop}>■ Detener</Button>}
      {state === 'recorded' && url && (
        <div className="space-y-2">
          <audio controls src={url} />
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => { setState('idle'); setUrl(null) }} disabled={disabled}>Volver a grabar</Button>
            <Button onClick={() => blobRef.current && onSubmit(blobRef.current)} disabled={disabled}>Enviar audio</Button>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5: `TurnFeedback.tsx` y `TurnTabs.tsx`**

`src/components/speaking/TurnFeedback.tsx`:

```tsx
'use client'
type Feedback = {
  correctedText: string
  naturalVersion: string
  fluencyTip: string
  correctionAudioPath: string | null
}
export function TurnFeedback({ fb }: { fb: Feedback }) {
  return (
    <div className="space-y-3 text-sm">
      <div><div className="font-medium">Corrección sugerida</div><p>{fb.correctedText}</p></div>
      <div><div className="font-medium">Más natural</div><p>{fb.naturalVersion}</p></div>
      <div><div className="font-medium">Tip de fluidez</div><p style={{ color: 'var(--muted)' }}>{fb.fluencyTip}</p></div>
      {fb.correctionAudioPath && (
        <audio controls src={`/api/audio/${fb.correctionAudioPath}`}>Escuchar corrección</audio>
      )}
    </div>
  )
}
```

`src/components/speaking/TurnTabs.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { Tabs } from '@/components/ui/Tabs'

export function TurnTabs({
  said,
  natural,
  aiReply,
}: {
  said: string
  natural: string
  aiReply?: string | null
}) {
  const tabs = [
    { id: 'said', label: 'Lo que dijiste' },
    { id: 'natural', label: 'Versión natural' },
    ...(aiReply ? [{ id: 'ai', label: 'Respuesta de la IA' }] : []),
  ]
  const [active, setActive] = useState('said')
  return (
    <div>
      <Tabs tabs={tabs} active={active} onChange={setActive} />
      <p className="p-3 text-sm">
        {active === 'said' && said}
        {active === 'natural' && natural}
        {active === 'ai' && aiReply}
      </p>
    </div>
  )
}
```

- [ ] **Step 6: `src/components/speaking/TurnView.tsx`** (client, orquesta un turno)

```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { AudioRecorder } from './AudioRecorder'
import { TurnFeedback } from './TurnFeedback'
import { TurnTabs } from './TurnTabs'

type OpenTurn = { index: number; assistantPrompt: string; assistantAudioPath: string | null }

export function TurnView({
  sessionId,
  mode,
  totalTurns,
  openTurn,
}: {
  sessionId: string
  mode: 'GUIDED' | 'MONOLOGUE'
  totalTurns: number
  openTurn: OpenTurn
}) {
  const router = useRouter()
  const [phase, setPhase] = useState<'record' | 'sending' | 'result' | 'error'>('record')
  const [error, setError] = useState<string | null>(null)
  const [pendingBlob, setPendingBlob] = useState<Blob | null>(null)
  const [result, setResult] = useState<any>(null)

  async function send(blob: Blob) {
    setPendingBlob(blob)
    setPhase('sending')
    setError(null)
    const fd = new FormData()
    fd.append('audio', blob, 'turn.webm')
    const res = await fetch(`/api/speaking/sessions/${sessionId}/turns`, { method: 'POST', body: fd })
    if (!res.ok) {
      setError((await res.json()).error ?? 'Error')
      setPhase('error')
      return
    }
    setResult(await res.json())
    setPhase('result')
    router.refresh()
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <div className="space-y-3">
          <div className="text-sm" style={{ color: 'var(--muted)' }}>
            {mode === 'GUIDED' ? `Turno ${openTurn.index} de ${totalTurns}` : 'Monólogo'}
          </div>
          <p className="font-medium">{openTurn.assistantPrompt}</p>
          {openTurn.assistantAudioPath && (
            <audio controls src={`/api/audio/${openTurn.assistantAudioPath}`} />
          )}

          {phase === 'record' && <AudioRecorder onSubmit={send} />}
          {phase === 'sending' && <Spinner label="Transcribiendo y analizando…" />}
          {phase === 'error' && (
            <div className="space-y-2">
              <p style={{ color: 'var(--warning)' }}>{error}</p>
              <Button onClick={() => pendingBlob && send(pendingBlob)}>Reintentar</Button>
            </div>
          )}
          {phase === 'result' && (
            <Button
              onClick={() =>
                result.sessionStatus === 'COMPLETED'
                  ? router.push(`/speaking/${sessionId}?done=1`)
                  : router.refresh()
              }
            >
              {result.sessionStatus === 'COMPLETED' ? 'Ver resumen' : 'Siguiente turno'}
            </Button>
          )}
        </div>
      </Card>

      {phase === 'result' && result && (
        <div className="space-y-4">
          <Card><TurnFeedback fb={result.turn} /></Card>
          <Card>
            <TurnTabs
              said={result.turn.userTranscript}
              natural={result.turn.naturalVersion}
              aiReply={mode === 'GUIDED' ? result.turn.nextAssistantPrompt : null}
            />
          </Card>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 7: `src/app/speaking/[sessionId]/page.tsx`**

```tsx
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { TurnView } from '@/components/speaking/TurnView'
import { SessionSummary } from '@/components/speaking/SessionSummary'

export const dynamic = 'force-dynamic'

export default async function SessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params
  const session = await prisma.speakingSession.findUnique({
    where: { id: sessionId },
    include: { turns: { orderBy: { index: 'asc' } } },
  })
  if (!session) notFound()

  if (session.status === 'COMPLETED') {
    return <SessionSummary session={session} />
  }

  const open = session.turns.find((t) => !t.userTranscript) ?? session.turns[session.turns.length - 1]
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Sesión de speaking</h1>
      <p className="text-sm" style={{ color: 'var(--muted)' }}>Tema: {session.topic}</p>
      <TurnView
        sessionId={session.id}
        mode={session.mode}
        totalTurns={session.totalTurns}
        openTurn={{ index: open.index, assistantPrompt: open.assistantPrompt, assistantAudioPath: open.assistantAudioPath }}
      />
    </div>
  )
}
```

(`SessionSummary` se crea en Task 19; hasta entonces, stub que renderiza `null` para que compile — se sustituye en la siguiente tarea.)

- [ ] **Step 8: `npm test` + `npm run build`**

Expected: verde (con el stub de `SessionSummary`).

- [ ] **Step 9: Commit**

```bash
git add -A && git commit -m "feat: grabador de audio, tubería de turno y pantalla de turno de speaking"
```

---

## Task 19: Speaking — resumen de sesión

**Files:**
- Create: `src/components/speaking/SessionSummary.tsx` (reemplaza el stub de Task 18)

**Interfaces:**
- Consumes: tipos de Prisma `SpeakingSession & { turns: SpeakingTurn[] }`.
- Produces: `<SessionSummary session={...} />` — server component. Lista cada turno completado con: prompt del asistente, "Lo que dijiste", "Corrección", "Versión natural", "Tip", y reproductores de `userAudioPath` y `correctionAudioPath`. Cabecera con `xpEarned` total y nº de turnos.

- [ ] **Step 1: Implementar `SessionSummary.tsx`**

```tsx
import Link from 'next/link'
import type { SpeakingSession, SpeakingTurn } from '@prisma/client'
import { Card } from '@/components/ui/Card'

export function SessionSummary({
  session,
}: {
  session: SpeakingSession & { turns: SpeakingTurn[] }
}) {
  const done = session.turns.filter((t) => t.userTranscript).sort((a, b) => a.index - b.index)
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Sesión completada</h1>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          Tema: {session.topic} · {done.length} turnos · +{session.xpEarned} XP
        </p>
      </div>

      {done.map((t) => (
        <Card key={t.id}>
          <div className="space-y-2 text-sm">
            <div className="font-medium">{session.mode === 'GUIDED' ? `Turno ${t.index}` : 'Monólogo'}: {t.assistantPrompt}</div>
            <div><span style={{ color: 'var(--muted)' }}>Lo que dijiste: </span>{t.userTranscript}</div>
            <div><span style={{ color: 'var(--muted)' }}>Corrección: </span>{t.correctedText}</div>
            <div><span style={{ color: 'var(--muted)' }}>Versión natural: </span>{t.naturalVersion}</div>
            <div><span style={{ color: 'var(--muted)' }}>Tip: </span>{t.fluencyTip}</div>
            <div className="flex flex-wrap gap-4 pt-1">
              {t.userAudioPath && <audio controls src={`/api/audio/${t.userAudioPath}`} />}
              {t.correctionAudioPath && <audio controls src={`/api/audio/${t.correctionAudioPath}`} />}
            </div>
          </div>
        </Card>
      ))}

      <Link href="/speaking" style={{ color: 'var(--primary)' }}>Nueva sesión</Link>
    </div>
  )
}
```

- [ ] **Step 2: `npm run build`**

Expected: sin errores.

- [ ] **Step 3: Prueba manual (con API key)**

Completar una sesión monólogo entera → al enviar el audio, la pantalla muestra feedback y el botón "Ver resumen"; al pulsarlo, `/speaking/<id>` muestra el resumen con XP total 20. Repetir con una sesión guiada de 5 turnos → XP total 100, `status` `COMPLETED`.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: resumen de sesión de speaking"
```

---

## Task 20: Home y Progreso

**Files:**
- Modify: `src/app/page.tsx`
- Create: `src/app/progress/page.tsx`

**Interfaces:**
- Consumes: `getProfile`, `levelFromXp`, `prisma`.
- Produces:
  - Home: `<ProgressRing>` con `xpIntoLevel/xpForNextLevel`, tarjeta "Continuar" (unidad con `lastOpenedAt` más reciente → enlace a `/learn/<id>`), accesos a Aprender/Speaking/Biblioteca, contadores rápidos.
  - `/progress`: XP total, nivel, racha actual/máxima, nº de `ExerciseAttempt`, nº de `SpeakingSession` completadas, e historial reciente combinado (últimos 20, ordenados por fecha desc): cada fila = tipo (ejercicio/speaking) + descripción + fecha + XP.

- [ ] **Step 1: `src/app/page.tsx`**

```tsx
import Link from 'next/link'
import { prisma } from '@/lib/db'
import { getProfile } from '@/lib/profile'
import { levelFromXp } from '@/lib/gamification/level'
import { Card } from '@/components/ui/Card'
import { ProgressRing } from '@/components/ui/ProgressRing'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const profile = await getProfile()
  const lvl = levelFromXp(profile.xp)
  const [lastUnit, attemptCount, sessionCount] = await Promise.all([
    prisma.unit.findFirst({ where: { lastOpenedAt: { not: null } }, orderBy: { lastOpenedAt: 'desc' } }),
    prisma.exerciseAttempt.count(),
    prisma.speakingSession.count({ where: { status: 'COMPLETED' } }),
  ])
  const pct = lvl.xpForNextLevel === 0 ? 0 : Math.round((lvl.xpIntoLevel / lvl.xpForNextLevel) * 100)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Bienvenido de nuevo 👋</h1>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <div className="flex items-center gap-4">
            <ProgressRing percent={pct} />
            <div>
              <div className="text-lg font-bold">Nivel {lvl.level}</div>
              <div className="text-sm" style={{ color: 'var(--muted)' }}>
                {lvl.xpIntoLevel} / {lvl.xpForNextLevel} XP · racha {profile.currentStreak} días
              </div>
            </div>
          </div>
        </Card>
        <Card>
          <div className="font-medium">Continuar</div>
          {lastUnit ? (
            <Link href={`/learn/${lastUnit.id}`} style={{ color: 'var(--primary)' }}>{lastUnit.title}</Link>
          ) : (
            <p className="text-sm" style={{ color: 'var(--muted)' }}>Aún no has empezado ninguna unidad.</p>
          )}
        </Card>
      </div>
      <div className="grid grid-cols-3 gap-4 text-sm">
        <Card><div style={{ color: 'var(--muted)' }}>Ejercicios hechos</div><div className="text-xl font-bold">{attemptCount}</div></Card>
        <Card><div style={{ color: 'var(--muted)' }}>Sesiones de speaking</div><div className="text-xl font-bold">{sessionCount}</div></Card>
        <Card><div style={{ color: 'var(--muted)' }}>XP total</div><div className="text-xl font-bold">{profile.xp}</div></Card>
      </div>
      <div className="flex gap-3">
        <Link href="/learn" style={{ color: 'var(--primary)' }}>Aprender</Link>
        <Link href="/speaking" style={{ color: 'var(--primary)' }}>Practicar speaking</Link>
        <Link href="/library" style={{ color: 'var(--primary)' }}>Biblioteca</Link>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: `src/app/progress/page.tsx`**

```tsx
import { prisma } from '@/lib/db'
import { getProfile } from '@/lib/profile'
import { levelFromXp } from '@/lib/gamification/level'
import { Card } from '@/components/ui/Card'

export const dynamic = 'force-dynamic'

export default async function ProgressPage() {
  const profile = await getProfile()
  const lvl = levelFromXp(profile.xp)
  const [attempts, sessions, attemptCount, sessionCount] = await Promise.all([
    prisma.exerciseAttempt.findMany({
      orderBy: { completedAt: 'desc' },
      take: 20,
      include: { exerciseSet: { include: { unit: true } } },
    }),
    prisma.speakingSession.findMany({
      where: { status: 'COMPLETED' },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.exerciseAttempt.count(),
    prisma.speakingSession.count({ where: { status: 'COMPLETED' } }),
  ])

  const rows = [
    ...attempts.map((a) => ({
      date: a.completedAt,
      label: `Ejercicio · ${a.exerciseSet.unit.title} · ${a.exerciseSet.type} · ${a.score}%`,
      xp: a.xpEarned,
    })),
    ...sessions.map((s) => ({
      date: s.createdAt,
      label: `Speaking · ${s.topic} · ${s.mode === 'GUIDED' ? 'guiado' : 'monólogo'}`,
      xp: s.xpEarned,
    })),
  ]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 20)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Progreso</h1>
      <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
        <Card><div style={{ color: 'var(--muted)' }}>Nivel</div><div className="text-xl font-bold">{lvl.level}</div></Card>
        <Card><div style={{ color: 'var(--muted)' }}>XP total</div><div className="text-xl font-bold">{profile.xp}</div></Card>
        <Card><div style={{ color: 'var(--muted)' }}>Racha actual</div><div className="text-xl font-bold">{profile.currentStreak}</div></Card>
        <Card><div style={{ color: 'var(--muted)' }}>Racha máxima</div><div className="text-xl font-bold">{profile.longestStreak}</div></Card>
        <Card><div style={{ color: 'var(--muted)' }}>Ejercicios</div><div className="text-xl font-bold">{attemptCount}</div></Card>
        <Card><div style={{ color: 'var(--muted)' }}>Sesiones speaking</div><div className="text-xl font-bold">{sessionCount}</div></Card>
      </div>

      <Card>
        <div className="mb-2 font-medium">Historial reciente</div>
        <ul className="space-y-1 text-sm">
          {rows.map((r, i) => (
            <li key={i} className="flex justify-between">
              <span>{r.label}</span>
              <span style={{ color: 'var(--muted)' }}>
                {r.date.toLocaleDateString('es')} · +{r.xp} XP
              </span>
            </li>
          ))}
          {rows.length === 0 && <li style={{ color: 'var(--muted)' }}>Sin actividad todavía.</li>}
        </ul>
      </Card>
    </div>
  )
}
```

- [ ] **Step 3: `npm run build` + prueba manual**

Expected: Home muestra anillo de progreso y "Continuar"; `/progress` muestra contadores e historial. Ambas sin error.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: home y página de progreso"
```

---

## Task 21: Cierre — banner de IA, `.env.local.example`, README y auto-revisión

**Files:**
- Modify: `README.md` (crear si no existe), `.env.local.example`
- Verify: `src/components/AiDisabledBanner.tsx` (ya creado en Task 13)

**Interfaces:**
- Consumes: todo lo anterior.
- Produces: instrucciones de arranque y verificación de los criterios de aceptación de la spec.

- [ ] **Step 1: `README.md`**

```markdown
# English Academy Tutor

App personal de estudio de inglés (uso individual, sin login).

## Requisitos
- Node 20+
- Clave de OpenAI en `.env.local` (`OPENAI_API_KEY`). Sin ella la app arranca
  pero las funciones de IA están desactivadas.

## Puesta en marcha
```bash
cp .env.local.example .env.local   # y rellena OPENAI_API_KEY
npm install
npx prisma migrate dev
npm run dev
```

## Comandos
- `npm run dev` — desarrollo
- `npm test` — tests (Vitest)
- `npm run lint` — lint
- `npm run build` — build de producción
- `npm run db:studio` — inspeccionar la base de datos

## Flujo
1. **Biblioteca**: sube un PDF con texto y marca unidades (título + páginas).
2. **Aprender**: elige una unidad y practica los 5 tipos de ejercicio. Ganas XP.
3. **Practicar speaking**: conversación guiada (5 turnos) o monólogo libre (1 turno).
   Grabas audio, la IA transcribe y corrige.
4. **Progreso**: XP, nivel, racha e historial.
```

- [ ] **Step 2: Verificar el flujo sin API key**

Quitar `OPENAI_API_KEY` de `.env.local`, `npm run dev`:
- El banner ámbar aparece bajo la cabecera en todas las páginas.
- `/library`: subir PDF y crear unidad **sí** funciona (no usa IA).
- `/learn/<id>`: abrir una pestaña muestra el error "La IA está desactivada" con botón "Reintentar".
- `/speaking`: monólogo se puede iniciar; al enviar audio da error 503 con mensaje claro. Guiado da error al iniciar.

- [ ] **Step 3: Verificar el flujo con API key (repaso de criterios de aceptación)**

Recorrer uno a uno los criterios de aceptación de la spec (`docs/superpowers/specs/2026-09-01-...-design.md`, sección "Criterios de aceptación") y marcar cada uno. Anotar cualquier fallo y corregirlo antes de cerrar.

- [ ] **Step 4: `npm test && npm run lint && npm run build`**

Expected: los tres verdes.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "docs: README y verificación del esqueleto"
```

---

## Self-Review (rellenado durante la redacción del plan)

**1. Cobertura de la spec:**

| Requisito de la spec | Tarea |
|---|---|
| Stack Next.js + TS + SQLite/Prisma | 1, 2 |
| Sin auth, `Profile` único | 2, 7 |
| Wrappers de IA aislados y mockeables | 10, 11 |
| Extracción de PDF con `unpdf` | 14 |
| Subir PDF ≤ 25 MB, rechazo de escaneados | 14 |
| Marcar unidades (título + páginas + nivel), texto congelado | 14 |
| `/learn` lista + pestaña por tipo | 15, 16 |
| Generación bajo demanda + caché + regenerar | 15 |
| 5 tipos de ejercicio con corrección | 16 (grading en 6) |
| XP: fórmulas por tipo y flashcards | 4, 16 |
| Nivel derivado de XP (curva) | 3, 13, 20 |
| Racha ayer/hoy/hueco + longest | 7 |
| `recordActivity` punto único de mutación | 7, 16, 18 |
| Speaking modo guiado (5 turnos) | 17, 18 |
| Speaking modo monólogo (1 turno, tema escrito) | 17, 18 |
| Tubería: transcribe → review → TTS | 18 |
| Panel de feedback + pestañas (con/sin "Respuesta de la IA") | 18 |
| Turno no se guarda a medias ante fallo + reintento | 18 |
| Resumen de sesión con turnos revisables | 19 |
| XP speaking 20/turno (100 guiado / 20 monólogo) | 18 |
| "Escuchar corrección" (TTS) | 18, 19 |
| Sidebar 5 secciones + cabecera XP/nivel/racha | 13 |
| Tema claro/oscuro persistido | 13 |
| Falta `OPENAI_API_KEY` → banner + IA deshabilitada | 13, 15, 17, 18, 21 |
| Validación zod de todas las respuestas de IA | 8, 9, 11 |
| `/progress` con contadores e historial | 20 |
| Servir audio desde disco | 13 |
| Vitest, TDD lógica pura, OpenAI mockeado | todas las tareas de `lib/` |

Sin huecos detectados.

**2. Placeholders:** El stub temporal de `SessionSummary` en Task 18 se sustituye por la implementación completa en Task 19 (Step 1). No hay otros "TODO"/"TBD". Los fixtures de ejercicios (Task 8) traen código generador completo (`Array.from`), no elipsis.

**3. Consistencia de tipos:**
- `GradeResult` (Task 6) usado por los componentes de Task 16 vía `onFinish({ correctCount, totalCount, answers })` — coincide.
- `xpForExercise(type, correctCount)` (Task 4) — misma firma en `/api/attempts` (Task 16).
- `recordActivity({ xp, now? })` (Task 7) — llamado sin `now` en producción (Tasks 16, 18), con `now` en tests.
- `TurnReview` (Task 9): `{ correctedText, naturalVersion, fluencyTip, nextAssistantPrompt }` — usado idéntico en `reviewSpeakingTurn` (Task 11), en la ruta de turno (Task 18) y en `TurnFeedback` (Task 18).
- Clave compuesta Prisma `unitId_type` — usada en Task 15 (`findUnique`/`upsert`) tal como la genera el `@@unique([unitId, type])` de Task 2.
- `saveAudioFile(bytes, ext)` devuelve ruta **relativa**; `/api/audio/[...path]` (Task 13) la resuelve con `readAudioFile`. Los `<audio src>` usan `/api/audio/${path}` de forma consistente (Tasks 18, 19).
- Enum `ExerciseType` de `@prisma/client` — importado como tipo en Tasks 4, 8, 11, 15, 16.

Sin inconsistencias.

---

## Notas de implementación (leer antes de empezar)

- **API del SDK de OpenAI:** el plan asume `openai.chat.completions.create` con `response_format: { type: 'json_object' }` y `openai.audio.transcriptions.create` / `openai.audio.speech.create`. Si la versión instalada difiere, consultar la doc vía `ctx7` antes de improvisar. `toFile` se importa de `'openai'` (fallback `'openai/uploads'`).
- **Tests que tocan la DB** (`db.test.ts`, `profile.test.ts`, `storage.test.ts`) usan la `dev.db` real y limpian lo que crean. Ejecutar `npx prisma migrate dev` antes de la primera pasada de tests.
- **Componentes React**: el plan usa estilos inline con variables CSS para no depender de configurar el tema en Tailwind. Si se prefiere, migrar a clases Tailwind con `dark:` — no cambia la lógica.
- **`params` es `Promise`** en los Route Handlers y páginas (Next 15). El plan ya lo refleja con `await params`.
- Cada tarea termina en verde de `npm test` (y `npm run build` donde se indica) antes del commit.










# Spec: Base de vocabulario + referencias de página en ejercicios

**Fecha:** 2026-09-02
**Estado:** En revisión
**Autor:** David Rodriguez (con Claude)

## Objetivo

Añadir una pestaña fija "Vocabulario" con una tabla acumulada de palabras que
el usuario introduce y la IA enriquece (traducción, significado, tipo,
pronunciación IPA, ejemplos), y permitir que los ejercicios generados citen la
página del libro cuando una pregunta se apoya en un pasaje concreto.

## Contexto y decisiones de alcance

- **Un solo usuario** (uso personal). Sin autenticación, coherente con el resto
  de la app.
- Dos partes **independientes** en una sola spec: A (vocabulario) y B
  (referencias de página). No comparten código; B no toca el esquema.
- **IA:** mismo patrón que `generateExercises` — `openai()`, `MODELS.chat`,
  `withRetry`, `AiError`. Sin `OPENAI_API_KEY` la app arranca y la acción de
  añadir palabra responde 503 con aviso.
- **Enriquecimiento no editable:** la IA fija todos los campos de contenido. A
  mano solo se cambia el estado (en progreso / aprendida) y se puede
  "Regenerar" (vuelve a pedir todo a la IA, conserva el estado).
- **Pronunciación:** voz del navegador (`window.speechSynthesis`) + IPA en
  texto. Sin ficheros de audio, sin coste, sin almacenamiento.
- **Sin gamificación:** el vocabulario es herramienta de consulta, no otorga XP
  ni afecta a la racha.
- **Idioma del contenido:** todo en inglés (significado, tipo, ejemplos) salvo
  la traducción, en español.

## Qué NO entra en esta spec

- Edición manual de los campos de contenido de una palabra (traducción,
  significado, tipo, IPA, ejemplos). Solo estado + regenerar.
- XP, racha, logros o cualquier integración de gamificación con el vocabulario.
- Ficheros de audio de pronunciación (MP3 de OpenAI TTS). Solo voz del
  navegador.
- Relación de una palabra con un libro, unidad o página de origen.
- Importación/exportación de listas de vocabulario (CSV, Anki…).
- Repaso espaciado (SRS), tarjetas de repaso o quiz sobre el vocabulario.
- Referencias de página en `MATCHING`, `ORDER_WORDS` y `FLASHCARDS`.
- Migración del contenido de `ExerciseSet` ya cacheado para añadir páginas (se
  regenera bajo demanda).
- Detección real de números de página impresos en el PDF; se usa la numeración
  de páginas del PDF (`unit.startPage` como página absoluta).
- Tests e2e o de UI.

---

## Parte A — Pestaña "Vocabulario"

### Modelo de datos

Nueva migración Prisma (`npm run db:migrate`):

```prisma
enum WordStatus {
  IN_PROGRESS
  LEARNED
}

model VocabEntry {
  id           String     @id @default(cuid())
  word         String     @unique   // clave normalizada: minúsculas + trim + espacios colapsados
  displayWord  String               // tal como lo escribió el usuario
  translation  String               // español
  meaning      String               // inglés
  partOfSpeech String               // "noun" | "verb" | "adjective" | "adverb" | "phrase" | ...
  ipa          String               // p.ej. /ˈwɜːrd/
  examples     String               // JSON: string[] (mín. 3), en inglés
  status       WordStatus @default(IN_PROGRESS)
  createdAt    DateTime   @default(now())
}
```

- `word` es la clave normalizada y lleva el `@unique`; el alta comprueba
  duplicados sobre ese valor.
- `displayWord` preserva mayúsculas/acentos originales para mostrar.
- `examples` se guarda serializado (igual que `ExerciseSet.content`).
- Sin relaciones. `partOfSpeech` es texto libre (lo decide la IA), no enum.

### Enriquecimiento con IA

**`src/lib/ai/prompts.ts` → `vocabPrompt(word: string)`**

- `system`: "Eres un diccionario para un estudiante hispanohablante de inglés.
  Responde SOLO con JSON válido con la forma indicada. Todo en inglés salvo
  `translation`, que va en español."
- Forma JSON exacta:
  `{ "translation": string, "meaning": string, "partOfSpeech": string, "ipa": string, "examples": string[] }`
  con la instrucción de al menos 3 ejemplos en inglés y `ipa` entre barras.
- `user`: `Palabra o expresión: "${word}"`.

**`src/lib/ai/vocab.ts` → `enrichVocab(word: string): Promise<VocabEnrichment>`**

Copia la estructura de `src/lib/ai/exercises.ts`:

```ts
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

Se exporta desde `src/lib/ai/index.ts`.

**`src/lib/validation/vocab.ts`**

```ts
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

### Lógica pura

**`src/lib/vocab/entry.ts`**

- `normalizeWord(raw: string): string` — `trim()`, `toLowerCase()`, colapsa
  espacios internos a uno. Lanza si queda vacío.
- `serializeExamples(examples: string[]): string` — valida `≥ 3` y devuelve
  JSON.
- `deserializeExamples(raw: string): string[]` — `JSON.parse` + valida array de
  strings no vacías (mín. 3).

### Rutas API

Todas `force-dynamic` (por defecto en la app), respuestas de error con
`{ error: string }` como el resto.

| Ruta | Cuerpo | Comportamiento |
|---|---|---|
| `POST /api/vocab` | `{ word }` | `normalizeWord`; 400 si vacía; 409 si ya existe (`word` único); 503 si `!isAiEnabled()`; `enrichVocab` → 502 en `AiError`; `prisma.vocabEntry.create` con `word` normalizada y `displayWord` original; devuelve la entrada (con `examples` deserializado). |
| `GET /api/vocab` | query `q`, `status` | `q`: `contains` (LIKE) sobre `word` y `translation`; `status`: filtro `IN_PROGRESS`/`LEARNED` si viene; orden `createdAt desc`; devuelve `{ entries: VocabEntryDTO[] }` con `examples` deserializado. |
| `PATCH /api/vocab/:id` | `{ status }` | valida `status ∈ WordStatus`; 404 si no existe; actualiza solo `status`; devuelve la entrada. |
| `POST /api/vocab/:id/regenerate` | — | 404 si no existe; 503 si IA off; `enrichVocab(entry.displayWord)` → 502 en `AiError`; actualiza campos de contenido, conserva `status` y `word`/`displayWord`; devuelve la entrada. |
| `DELETE /api/vocab/:id` | — | 404 si no existe; borra; `{ ok: true }`. |

`GET` existe porque la tabla es un componente cliente que refresca tras
añadir/editar/borrar/regenerar y aplica búsqueda/filtro server-side.

Nota SQLite/Prisma: no hay `mode: 'insensitive'`; `LIKE` en SQLite ya es
insensible a mayúsculas para ASCII. `q` se compara en minúsculas contra `word`
(ya normalizada) y con `contains` sobre `translation`.

### UI

- **`src/components/Sidebar.tsx`**: añadir `{ href: '/vocab', label: 'Vocabulario' }`
  después de "Aprender".
- **`src/app/vocab/page.tsx`** (server component, `export const dynamic = 'force-dynamic'`):
  carga inicial `prisma.vocabEntry.findMany({ orderBy: { createdAt: 'desc' } })`,
  deserializa `examples`, renderiza `<h1>Vocabulario</h1>` + `<VocabTable initial={...} />`.
- **`src/components/vocab/VocabTable.tsx`** (client):
  - Formulario de alta: un `<input>` (palabra/expresión) + botón "Añadir".
    Estados: enviando (spinner), error (`errorFrom`), 409 mostrado como "ya está
    en tu lista".
  - Controles: `<input>` de búsqueda (debounce ~300 ms) + `<select>` estado
    (Todas / En progreso / Aprendidas). Al cambiar → `GET /api/vocab?q=&status=`.
  - Tabla dentro de contenedor `overflow-x-auto`. Columnas:
    **Palabra (EN)** (`displayWord`) · **Traducción (ES)** · **Tipo**
    (`partOfSpeech`) · **Significado (EN)** · **IPA** · **🔊** (`<SpeakButton>`) ·
    **Ejemplos** (lista `<ul>` con los ≥3) · **Estado** (botón toggle
    IN_PROGRESS↔LEARNED vía `PATCH`) · **Acciones** ("Regenerar" → `POST
    /regenerate` con spinner en fila; "Borrar" → `DELETE`, sin `confirm()` nativo
    para no bloquear; botón con doble clic o estado "¿seguro?" inline).
  - Reutiliza `Card`, `Button`, `Spinner`, `errorFrom` de `@/lib/http`.
- **`src/components/vocab/SpeakButton.tsx`** (client):
  - `word: string`. Al pulsar: `const u = new SpeechSynthesisUtterance(word); u.lang = 'en-US';`
    elige una voz inglesa de `speechSynthesis.getVoices()` si hay; `speechSynthesis.cancel()` + `speak(u)`.
  - Si `typeof window === 'undefined' || !('speechSynthesis' in window)`: botón
    deshabilitado con `title` explicativo. Nunca lanza diálogos.

Sin `confirm`/`alert` en toda la feature (restricción del entorno de la app).

### Tests (Vitest, aislados)

- **`src/lib/vocab/entry.test.ts`**: `normalizeWord` (trim, minúsculas, espacios
  colapsados, vacío lanza); `serializeExamples`/`deserializeExamples`
  (ida y vuelta, rechaza < 3, rechaza no-array).
- **`src/lib/validation/vocab.test.ts`**: schema acepta payload válido; rechaza
  `examples` con 2 elementos; rechaza campos ausentes o vacíos.
- **`src/lib/ai/vocab.test.ts`**: mock del cliente OpenAI (patrón de
  `src/lib/ai/exercises.test.ts`); devuelve JSON válido → objeto parseado;
  respuesta sin `content` → `AiError`; JSON que incumple el schema → lanza.

---

## Parte B — Referencias de página en ejercicios

### Punto de partida

- `Book.rawText` se guarda como `JSON.stringify(pages)` (array de strings, una
  por página del PDF) — ver `src/app/api/books/route.ts`.
- `Unit.startPage` / `Unit.endPage` son páginas absolutas del PDF.
- Por tanto el texto por página es recuperable sin cambios de esquema.

### Cambios

**`src/lib/pdf.ts` → `sliceUnitPages(pages, startPage, endPage)`**

Nuevo helper junto a `sliceUnitText` (que se mantiene, lo usa `/api/units`):

```ts
export function sliceUnitPages(
  pages: string[], startPage: number, endPage: number,
): { page: number; text: string }[]
```

Misma validación de rango que `sliceUnitText`; devuelve un objeto por página con
el **número absoluto** (`startPage + i`) y su texto. Omite páginas vacías.

**`src/lib/ai/prompts.ts` → `exercisePrompt`**

Firma nueva: `exercisePrompt(unitText: string, type: ExerciseType, pages?: PageSlice[])`.

- Si `pages` viene (solo para `MULTIPLE_CHOICE` y `FILL_BLANKS`), el bloque de
  texto se monta así:
  ```
  === Página 12 ===
  <texto de la página 12>

  === Página 13 ===
  <texto de la página 13>
  ```
  y se añade a la instrucción: *"Si una pregunta se apoya en un pasaje concreto,
  incluye `page` con el número de página mostrado arriba. Si es general, omite
  `page`."*
- Las `SHAPE` de `MULTIPLE_CHOICE` y `FILL_BLANKS` incluyen `"page"?: number`.
- Sin `pages`: comportamiento actual exacto (los otros tres tipos no cambian).

**`src/lib/ai/exercises.ts` → `generateExercises`**

Firma nueva: `generateExercises(unitText, type, opts?: { pages?: PageSlice[] })`.
Pasa `opts?.pages` a `exercisePrompt`. Resto igual.

**`src/lib/validation/exercises.ts`**

Añadir a los items de `multipleChoiceSchema` y `fillBlanksSchema`:

```ts
page: z.number().int().positive().optional()
```

Al ser opcional, el contenido de `ExerciseSet` ya cacheado (sin `page`) sigue
validando; para obtener páginas hay que "Regenerar".

**`src/app/api/units/[id]/exercises/route.ts`**

Para `type ∈ { MULTIPLE_CHOICE, FILL_BLANKS }`:

```ts
const unit = await prisma.unit.findUnique({ where: { id }, include: { book: true } })
// ...
const bookPages: string[] = JSON.parse(unit.book.rawText)
const pageSlices = sliceUnitPages(bookPages, unit.startPage, unit.endPage)
const content = await generateExercises(unit.extractedText, type, { pages: pageSlices })
```

Para los demás tipos: `generateExercises(unit.extractedText, type)` sin cambios.

**UI**

- `src/components/exercises/MultipleChoice.tsx`: junto a `{i + 1}. {q.question}`,
  `{q.page && <span className="ml-2 text-xs" style={{ color: 'var(--muted)' }}>(pág. {q.page})</span>}`.
- `src/components/exercises/FillBlanks.tsx`: mismo `<span>` al final de la frase
  del item.

### Tests

- **`src/lib/pdf.test.ts`**: `sliceUnitPages` devuelve números de página
  absolutos correctos y el texto de cada página; respeta el recorte a
  `pages.length`; rango inválido lanza.
- **`src/lib/validation/exercises.test.ts`**: item MCQ/fill-blanks con `page: 12`
  válido; `page: 0` y `page: -1` rechazados; item sin `page` válido.
- **`src/lib/ai/exercises.test.ts`**: con `opts.pages`, el prompt contiene los
  marcadores `=== Página N ===`; sin `opts.pages`, no.

---

## Plan de implementación (pasos commiteables)

Rama: `spec-vocabulario-referencias-pagina` (o la que decida el flujo del repo).

1. **Migración Prisma** — `WordStatus` + `VocabEntry`; `npm run db:migrate`;
   `prisma generate`.
2. **Vocab · lógica pura + validación** — `src/lib/vocab/entry.ts`,
   `src/lib/validation/vocab.ts` + tests. `npm test` verde.
3. **Vocab · módulo IA** — `vocabPrompt` en `prompts.ts`, `src/lib/ai/vocab.ts`,
   export en `index.ts` + `src/lib/ai/vocab.test.ts`.
4. **Vocab · rutas API** — `POST/GET /api/vocab`, `PATCH /api/vocab/[id]`,
   `POST /api/vocab/[id]/regenerate`, `DELETE /api/vocab/[id]`.
5. **Vocab · UI** — `src/app/vocab/page.tsx`, `VocabTable.tsx`, `SpeakButton.tsx`,
   enlace en `Sidebar.tsx`. `npm run lint` + `npm run build` verdes.
6. **Ejercicios · páginas (lógica)** — `sliceUnitPages` en `pdf.ts` + campo
   `page` opcional en `validation/exercises.ts` + tests.
7. **Ejercicios · prompt + generación** — `exercisePrompt` y `generateExercises`
   con `pages`; wiring en `/api/units/[id]/exercises/route.ts` + tests de
   `exercises.test.ts`.
8. **Ejercicios · UI** — "(pág. N)" en `MultipleChoice.tsx` y `FillBlanks.tsx`.

Pasos 1–5 = Parte A. Pasos 6–8 = Parte B. Cada paso es un commit; sin commit
automático.

## Criterios de aceptación

- [ ] Existe la pestaña "Vocabulario" en la barra lateral y carga en `/vocab`.
- [ ] Escribir una palabra y pulsar "Añadir" crea una fila con traducción (ES),
      tipo, significado (EN), IPA y ≥ 3 ejemplos (EN), generados por IA.
- [ ] Añadir una palabra que ya existe (ignorando mayúsculas/espacios) no crea
      duplicado y muestra aviso.
- [ ] Con `OPENAI_API_KEY` ausente, "Añadir" muestra un error claro y la app
      sigue navegable.
- [ ] El botón 🔊 reproduce la palabra con la voz del navegador; si el navegador
      no lo soporta, el botón está deshabilitado sin romper la página.
- [ ] El buscador filtra por palabra y traducción; el filtro de estado funciona.
- [ ] El toggle de estado persiste (en progreso ↔ aprendida).
- [ ] "Regenerar" vuelve a rellenar los campos de contenido y conserva el estado.
- [ ] "Borrar" elimina la fila sin diálogo nativo bloqueante.
- [ ] Ningún campo de contenido es editable a mano en la UI.
- [ ] El vocabulario no modifica XP ni racha.
- [ ] Al regenerar un ejercicio de opción múltiple o de rellenar huecos, algunas
      preguntas basadas en un pasaje muestran "(pág. N)" con número absoluto
      correcto; las preguntas generales no muestran página.
- [ ] Los ejercicios `MATCHING`, `ORDER_WORDS` y `FLASHCARDS` no cambian.
- [ ] El contenido de ejercicios cacheado antes del cambio sigue cargando sin
      error.
- [ ] `npm test`, `npm run lint` y `npm run build` pasan.

## Decisiones tomadas

- **Voz del navegador en vez de MP3 de OpenAI TTS.** Gratis, instantáneo, sin
  disco. Se pierde consistencia de voz entre dispositivos y calidad, aceptable
  para consulta personal.
- **Contenido no editable a mano; solo estado + regenerar.** Menos superficie de
  UI y de estado; la IA es la fuente de verdad del contenido.
- **`word` normalizada como clave única.** Evita duplicados "Word"/"word "/"WORD"
  sin depender de colaciones de SQLite.
- **`page` opcional en el schema de ejercicios.** No requiere migrar contenido
  cacheado; la página aparece al regenerar.
- **`partOfSpeech` como texto libre, no enum.** La IA puede devolver "phrasal
  verb", "idiom", etc.; un enum sería frágil.
- **Reconstruir páginas desde `Book.rawText` en la ruta.** El dato ya está; no
  hace falta guardar el texto por página en `Unit`.

## Decisiones descartadas

- **MP3 de pronunciación con OpenAI TTS** (y opción "ambos"). Coste por palabra y
  almacenamiento para un beneficio marginal frente a la voz del navegador.
- **XP al añadir o al marcar como aprendida.** Añade acoplamiento con
  gamificación; el usuario prefiere el vocabulario como herramienta neutra.
- **Edición libre de todas las celdas.** Contradice "la IA autocompleta"; más
  complejidad de formularios y validación.
- **Relacionar la palabra con libro/unidad/página de origen.** No pedido; se
  puede añadir después sin romper el modelo.
- **Números de página impresos reales (OCR del encabezado).** Fuera de alcance;
  la numeración del PDF es suficiente.
- **Referencias de página en matching/order-words/flashcards.** Esos formatos no
  se apoyan en un pasaje localizable de la misma forma.

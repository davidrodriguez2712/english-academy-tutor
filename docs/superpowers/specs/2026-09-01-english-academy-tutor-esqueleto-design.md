# Spec: English Academy Tutor — Esqueleto

**Fecha:** 2026-09-01
**Estado:** En revisión
**Autor:** David Rodriguez (con Claude)

## Objetivo

Crear el esqueleto funcional de una app web personal para estudiar inglés a
partir de los propios libros del usuario, de forma gamificada, con un módulo
de práctica de speaking asíncrona (grabas audio, la IA transcribe y corrige).

## Contexto y decisiones de alcance

- **Un solo usuario** (uso personal). Sin autenticación, sin multiusuario.
- **Stack:** Next.js (App Router) full-stack en local, TypeScript, SQLite + Prisma.
- **IA:** OpenAI para todo — `gpt-4o-transcribe` (STT), `gpt-4o` / `gpt-4o-mini`
  (generación y corrección), `gpt-4o-mini-tts` (TTS).
- Este es el **primer sub-proyecto**: un esqueleto que toca ambos subsistemas
  (estudio gamificado + speaking) con lo mínimo de cada uno. Funcionalidades
  avanzadas se abordan en specs posteriores.
- **Estrategia de contenido:** generar bajo demanda y cachear en la base de datos
  (Opción A). La primera vez que se abre un tipo de ejercicio de una unidad se
  llama a OpenAI y se guarda el resultado; las siguientes visitas son instantáneas.

## Qué NO entra en esta spec

- Autenticación, cuentas, multiusuario, despliegue en producción.
- Detección automática de unidades en el PDF. OCR para PDFs escaneados.
- Edición de rangos de página de una unidad tras crearla (se borra y se recrea).
- Portadas reales de libros.
- Gamificación avanzada: logros, retos diarios, metas diarias, leaderboard,
  glosario, buscador global.
- Barras de "Aspectos a mejorar" en speaking (pronunciación, entonación,
  conectores…). Análisis de pronunciación desde el audio.
- Modos de speaking extra: roleplay, shadowing, respuesta rápida.
- Gráficas en la vista de progreso.
- Tests e2e o de UI.

## Arquitectura

### Stack y estructura

- **Next.js App Router** + TypeScript. `npm run dev` en local.
- **Route Handlers** (`app/api/...`) para operaciones de servidor: subir/procesar
  PDF, generar ejercicios, corregir turnos de speaking, servir audio.
- **SQLite + Prisma.** `prisma/dev.db` (gitignored). Migraciones con
  `npx prisma migrate dev`.
- **Extracción de PDF:** librería `unpdf` (Node puro, sin binarios nativos).
- **Audio en el navegador:** `MediaRecorder` API. El blob (webm/opus) se envía al
  endpoint correspondiente.
- **Almacenamiento de audio** (grabaciones del usuario y audio TTS): en
  `./storage/audio/` (gitignored). Servido por un route handler
  (`GET /api/audio/[...path]`). Sin blob storage externo.
- **PDFs subidos:** en `./storage/books/` (gitignored).
- **Config:** `.env.local` con `OPENAI_API_KEY`. Si falta, la app arranca pero las
  acciones de IA se deshabilitan con aviso claro.
- **Tema:** `next-themes` + variables CSS. Claro por defecto, toggle a oscuro
  persistido en `localStorage`.
- **UI:** Tailwind CSS + componentes propios simples (Card, Button, Tabs,
  ProgressRing, ProgressBar). Sin librería de componentes pesada.

### Estructura de carpetas (aproximada)

```
app/
  page.tsx                  Home
  learn/                    lista de unidades + /learn/[unitId]
  speaking/                 inicio + /speaking/[sessionId]
  library/                  lista de libros + /library/[bookId]
  progress/
  api/
    books/                  POST subir PDF
    units/                  POST crear unidad
    units/[id]/exercises/   POST generar/obtener set por tipo
    attempts/               POST registrar intento de ejercicio
    speaking/sessions/      POST crear sesión
    speaking/sessions/[id]/turns/  POST enviar audio de un turno
    audio/[...path]/        GET servir archivos de audio
components/
  StatsHeader, Sidebar, Card, Button, Tabs, ProgressRing, ProgressBar,
  AudioRecorder, exercise/* (uno por tipo), speaking/*
lib/
  ai/                       wrappers de OpenAI: generateExercises,
                            reviewSpeakingTurn, transcribe, synthesizeSpeech
  db.ts                     cliente Prisma
  gamification/             levelFromXp, recordActivity
  validation/               esquemas zod de las respuestas de IA
prisma/schema.prisma
storage/audio/  storage/books/
```

### Wrappers de IA (`lib/ai/`)

Toda llamada a OpenAI vive aquí, una función por tarea. Esto permite mockear en
tests y centralizar el manejo de errores:

- `transcribe(audioBlob): Promise<string>` — `gpt-4o-transcribe`.
- `generateExercises(unitText, type): Promise<ExerciseContent>` — un prompt por
  tipo, respuesta validada con zod.
- `reviewSpeakingTurn(params): Promise<TurnReview>` — recibe transcript + contexto
  de conversación + modo; devuelve `correctedText`, `naturalVersion`,
  `fluencyTip` y, solo en modo guiado y turnos 1–4, `nextAssistantPrompt`.
- `synthesizeSpeech(text): Promise<Buffer>` — `gpt-4o-mini-tts`.

Manejo de errores común: reintento automático 1 vez ante fallo transitorio
(rate limit, JSON inválido). Si tras el reintento falla, se propaga un error
tipado y la capa de API responde con mensaje claro. Ninguna respuesta que no
valide con zod se persiste.

## Modelo de datos (Prisma)

No hay tabla `User`. Un registro único `Profile` para contadores globales.

- **`Profile`** (fila única): `xp` (Int), `currentStreak` (Int),
  `longestStreak` (Int), `lastActivityDate` (DateTime?). El nivel se **deriva**
  de `xp`, no se almacena.
- **`Book`**: `id`, `title`, `filename`, `pageCount` (Int), `rawText` (String),
  `createdAt`.
- **`Unit`**: `id`, `bookId` (FK), `title`, `startPage` (Int), `endPage` (Int),
  `level` (String?, p.ej. "A2–B1"), `extractedText` (String, congelado al crear),
  `createdAt`, `lastOpenedAt` (DateTime?).
- **`ExerciseSet`**: `id`, `unitId` (FK), `type` (enum: `MULTIPLE_CHOICE`,
  `FILL_BLANKS`, `MATCHING`, `ORDER_WORDS`, `FLASHCARDS`), `content` (Json),
  `generatedAt`. Restricción única `(unitId, type)`. "Regenerar" sobrescribe.
- **`ExerciseAttempt`**: `id`, `exerciseSetId` (FK), `score` (Int, 0–100),
  `correctCount` (Int), `totalCount` (Int), `xpEarned` (Int), `answers` (Json),
  `completedAt`.
- **`SpeakingSession`**: `id`, `mode` (enum: `GUIDED`, `MONOLOGUE`),
  `unitId` (FK, nullable), `topic` (String), `status` (enum: `IN_PROGRESS`,
  `COMPLETED`), `totalTurns` (Int), `xpEarned` (Int), `createdAt`.
- **`SpeakingTurn`**: `id`, `sessionId` (FK), `index` (Int), `assistantPrompt`
  (String), `assistantAudioPath` (String?), `userAudioPath` (String?),
  `userTranscript` (String?), `correctedText` (String?), `naturalVersion`
  (String?), `fluencyTip` (String?), `correctionAudioPath` (String?),
  `createdAt`.

Todo el contenido generado por IA se guarda ya resuelto (JSON o texto). Nada se
recalcula al vuelo.

## Ingesta de libros (`/library`)

### Flujo

1. **Subir PDF** → `POST /api/books` (multipart). Validaciones: es PDF, tamaño
   ≤ 25 MB. Se guarda en `storage/books/`, se extrae el texto con `unpdf`, se
   crea `Book` con `rawText` y `pageCount`. Si el PDF no tiene capa de texto
   (escaneado): error "este PDF no tiene texto seleccionable, no puedo procesarlo".
2. **Marcar unidades** en `/library/[bookId]`: formulario con `título`,
   `página inicio`, `página fin`, `nivel` (opcional). `POST /api/units` recorta el
   texto de ese rango de páginas de `Book.rawText` y lo congela en
   `Unit.extractedText`. Validación: `startPage ≤ endPage ≤ pageCount`.
3. La unidad se muestra como tarjeta con botones **"Estudiar"** (→ `/learn/[unitId]`)
   y **"Practicar speaking"** (→ `/speaking` con la unidad preseleccionada).

### Pantallas

- `/library` — lista de libros (tarjeta con portada genérica) + botón subir.
- `/library/[bookId]` — datos del libro, lista de unidades, formulario para añadir.

## Módulo de estudio (`/learn`) y gamificación

### Selección y pantalla de unidad

- `/learn` — lista de todas las unidades de todos los libros.
- `/learn/[unitId]` — 5 pestañas: Opción múltiple · Rellenar huecos · Relacionar ·
  Ordenar frases · Flashcards.

### Generación (Opción A)

Al abrir una pestaña por primera vez → `POST /api/units/[id]/exercises?type=...`.
Si ya existe `ExerciseSet` para `(unitId, type)`, se devuelve tal cual. Si no, se
llama a `generateExercises(unit.extractedText, type)`, se valida con zod, se
guarda y se devuelve. Botón "Regenerar" fuerza nueva generación (sobrescribe).

### Formato de cada tipo (contenido JSON)

- **Opción múltiple:** 10 preguntas; cada una `{ question, options[4],
  correctIndex, explanation }`.
- **Rellenar huecos:** 10 ítems; cada uno `{ sentence (con "___"), answer,
  acceptedVariants[] }`. Comparación normalizada (minúsculas, sin tildes, trim).
- **Relacionar:** 8 pares `{ left, right }` (término ↔ definición/traducción).
- **Ordenar frases:** 6 ítems; cada uno `{ scrambled[], correctOrder[] }`.
- **Flashcards:** 15 tarjetas `{ front, back }`. No puntúan; el usuario marca
  "la sabía" / "no la sabía".

### Corrección

- Deterministas en cliente: opción múltiple, ordenar frases, relacionar.
- Rellenar huecos: normalización + `acceptedVariants`.
- Al completar un set → `POST /api/attempts` guarda `ExerciseAttempt` y aplica XP
  vía `recordActivity`.

### Gamificación (`lib/gamification/`)

- **XP:**
  - Opción múltiple / rellenar huecos / relacionar / ordenar frases:
    10 XP por set completado + 2 XP por acierto.
  - Flashcards: 5 XP por sesión completada.
  - Speaking: 20 XP por turno (ver módulo de speaking).
- **Nivel:** función pura `levelFromXp(xp)`. Curva: el nivel `n` requiere
  `100 * n * (n + 1) / 2` XP acumulado. Devuelve
  `{ level, currentLevelXp, nextLevelXp, xpIntoLevel }`.
- **Racha:** al registrar cualquier actividad (`recordActivity`):
  - `lastActivityDate` fue ayer → `currentStreak++`.
  - fue hoy → sin cambio.
  - fue antes de ayer, o es null → `currentStreak = 1`.
  - Se actualiza `longestStreak = max(longestStreak, currentStreak)` y
    `lastActivityDate = hoy`.
  - Comparación por fecha local (no timestamp).
- **`recordActivity({ xp })`** es el único punto de mutación de `Profile`:
  suma XP y actualiza racha en una transacción.

### Home (`/`)

- `<StatsHeader>`: XP total, nivel con barra de progreso al siguiente, racha
  (🔥 + días).
- Tarjeta "Continuar" — última unidad con `lastOpenedAt` más reciente.
- Accesos directos a Aprender / Speaking / Biblioteca.
- Sin metas diarias, retos ni logros.

## Módulo de speaking (`/speaking`)

Dos modos: **conversación guiada** y **monólogo libre**.

### Inicio

`/speaking` — el usuario elige modo:

- **Guiado:** elige una unidad (o "tema libre" escrito). `POST /api/speaking/sessions`
  con `mode = GUIDED` crea la sesión (`totalTurns = 5`) y genera el **primer turno**:
  `reviewSpeakingTurn` no aplica aquí; se usa un prompt de generación que produce
  `assistantPrompt` (p.ej. "Tell me about your morning routine") a partir del
  tema/unidad, y `synthesizeSpeech` genera su audio.
- **Monólogo:** el usuario **escribe el tema** (texto libre, p.ej. "My last trip").
  Sin unidad obligatoria. `POST /api/speaking/sessions` con `mode = MONOLOGUE`
  crea la sesión (`totalTurns = 1`, un único `SpeakingTurn` con
  `assistantPrompt` = el tema escrito). **No** se genera prompt de asistente ni
  TTS de bienvenida.

### Turno (`/speaking/[sessionId]`, layout tipo `pantalla_4`)

1. **Guiado:** se ve y se puede escuchar el prompt del asistente ("Turno N de 5").
   **Monólogo:** se ve el tema escrito.
2. Grabación con `AudioRecorder` (`MediaRecorder`): grabar, previsualizar,
   "Volver a grabar", "Enviar audio". El blob queda en memoria del cliente hasta
   confirmar envío.
3. `POST /api/speaking/sessions/[id]/turns` con el blob. Tubería síncrona en el
   servidor:
   - `transcribe(blob)` → `userTranscript`.
   - `reviewSpeakingTurn({ transcript, mode, history, turnIndex })` → JSON (zod):
     `correctedText`, `naturalVersion`, `fluencyTip`; además `nextAssistantPrompt`
     solo si `mode = GUIDED` y `turnIndex < 5`.
   - `synthesizeSpeech(correctedText)` → `correctionAudioPath`. En guiado con
     siguiente turno, también `synthesizeSpeech(nextAssistantPrompt)`.
   - Guarda el `SpeakingTurn` (completo) y, si hay siguiente, crea el turno
     siguiente con su `assistantPrompt` y audio.
   - Devuelve todo al cliente.
4. **Panel de feedback** (derecha): "Corrección sugerida" (`correctedText`),
   "Más natural" (`naturalVersion`), "Tip de fluidez" (`fluencyTip`), botón
   **"Escuchar corrección"** (reproduce `correctionAudioPath`).
5. **Pestañas** (abajo):
   - Guiado: *Lo que dijiste* · *Versión natural* · *Respuesta de la IA*
     (el `nextAssistantPrompt`).
   - Monólogo: *Lo que dijiste* · *Versión natural* (sin "Respuesta de la IA").
6. **Guiado:** botón "Siguiente turno" (hasta el 5). **Monólogo:** al recibir el
   feedback la sesión termina.

### Fin de sesión

- `status = COMPLETED`. XP: **20 XP por turno** vía `recordActivity` (guiado: 100
  XP por sesión completa; monólogo: 20 XP).
- Pantalla de resumen con todos los turnos revisables (transcript, corrección,
  versión natural, audios).

### Estados de carga y error

- Cada envío puede tardar ~5–15 s → spinner con texto por fase
  ("Transcribiendo…", "Analizando…", "Generando audio…").
- Si un paso de la tubería falla, el turno **no se guarda a medias**: se muestra
  error y "reintentar" con el mismo audio (sigue en memoria del cliente).

## UI y navegación

### Sidebar (fija, estilo mockups)

`Inicio` · `Aprender` · `Practicar speaking` · `Biblioteca` · `Progreso`.

(Glosario, Logros, Retos, Ajustes y buscador → specs posteriores. La sección
"Practicar" de los mockups se fusiona en "Aprender" para el esqueleto.)

### Cabecera

`<StatsHeader>` (server component alimentado por `Profile`): racha (🔥 + días),
XP total, nivel con barra de progreso al siguiente nivel.

### `/progress`

Vista sencilla: XP total, nivel, racha actual y máxima, nº de sets de ejercicio
completados, nº de sesiones de speaking, y lista del historial reciente
(`ExerciseAttempt` + `SpeakingSession`, ordenados por fecha). Sin gráficas.

### Tema y paleta

Claro por defecto + toggle oscuro (`next-themes`, persistido en `localStorage`).
Paleta siguiendo los mockups: morado primario, tarjetas redondeadas, acentos
verde/ámbar.

## Manejo de errores transversal

- Falta `OPENAI_API_KEY` → banner global y botones de IA deshabilitados con
  tooltip explicativo.
- Errores de OpenAI (rate limit, JSON inválido) → reintento automático 1 vez;
  si falla, mensaje claro + acción "reintentar".
- Todas las respuestas de IA se validan con **zod**; si no validan, se tratan
  como error y no se persisten.
- Subida de PDF: límite 25 MB, rechazo de no-PDF, aviso si no hay texto extraíble.

## Testing

- **Vitest** para lógica pura:
  - `levelFromXp`: límites de nivel, XP en cero, XP muy alto.
  - `recordActivity`: racha con `lastActivityDate` = ayer / hoy / hace 3 días /
    null; actualización de `longestStreak`; suma de XP.
  - Normalización de respuestas de "rellenar huecos" (tildes, mayúsculas,
    espacios, variantes aceptadas).
  - Corrección determinista de opción múltiple, ordenar frases y relacionar.
- **Validadores zod** de las respuestas de IA: fixtures JSON válidos e inválidos
  para cada tipo de ejercicio y para `TurnReview` (guiado y monólogo).
- Las llamadas a OpenAI se aíslan tras `lib/ai/` y se **mockean** en tests.
- **TDD:** primero el test de la función pura, luego la implementación.
- Sin tests e2e ni de UI.

### Comandos

- `npm run dev` — servidor de desarrollo.
- `npm run test` — Vitest.
- `npm run lint` — ESLint.
- `npx prisma migrate dev` — migraciones.

## Criterios de aceptación

- [ ] `npm run dev` levanta la app; la navegación de la sidebar funciona en las 5 secciones.
- [ ] Se puede subir un PDF con texto y se crea un `Book` con su texto extraído y nº de páginas.
- [ ] Se puede crear una `Unit` (título + rango de páginas + nivel) y su `extractedText` contiene el texto de ese rango.
- [ ] Un PDF escaneado (sin texto) es rechazado con mensaje claro.
- [ ] En `/learn/[unitId]`, abrir cada una de las 5 pestañas genera (primera vez) y muestra su ejercicio; recargar la página lo sirve desde la base de datos sin nueva llamada a OpenAI.
- [ ] "Regenerar" produce un `ExerciseSet` nuevo que sobrescribe el anterior.
- [ ] Completar un ejercicio de opción múltiple guarda un `ExerciseAttempt` con score y XP correctos, y el XP se refleja en la cabecera.
- [ ] Flashcards: se pueden pasar las 15 tarjetas y la sesión otorga 5 XP.
- [ ] La racha sube en +1 al hacer actividad un día nuevo consecutivo, y se reinicia a 1 tras un hueco.
- [ ] `levelFromXp` y `recordActivity` tienen tests que pasan.
- [ ] Speaking guiado: se inicia una sesión con prompt inicial (texto + audio), se graban y envían 5 turnos, cada uno devuelve corrección + versión natural + tip + audio, y la sesión se marca `COMPLETED` con 100 XP.
- [ ] Speaking monólogo: se inicia con un tema escrito, se graba y envía una toma, se recibe corrección + versión natural + tip + audio (sin "Respuesta de la IA", sin siguiente turno), y la sesión termina con 20 XP.
- [ ] "Escuchar corrección" reproduce el audio TTS de la corrección.
- [ ] Si falta `OPENAI_API_KEY`, la app arranca y las acciones de IA están deshabilitadas con aviso.
- [ ] Un fallo en la tubería de un turno de speaking no deja el turno guardado a medias y permite reintentar con el mismo audio.
- [ ] `/progress` muestra XP, nivel, racha actual/máxima, contadores e historial reciente.
- [ ] Toggle de tema claro/oscuro funciona y persiste al recargar.

## Decisiones tomadas

- **Uso personal, sin auth** — un `Profile` único, nivel derivado de XP.
- **OpenAI para todo** (STT, LLM, TTS) — una sola cuenta y API key. (El usuario
  eligió OpenAI sobre Claude explícitamente.)
- **Generar bajo demanda + cachear en DB** (Opción A) frente a generar todo al
  crear la unidad (B) o todo al vuelo (C): equilibra coste, velocidad e historial
  estable.
- **Los 5 tipos de ejercicio desde el esqueleto** (no solo opción múltiple).
- **Speaking con dos modos:** conversación guiada de 5 turnos + monólogo libre de
  1 turno sobre un tema escrito por el usuario.
- **`unpdf`** para extracción de PDF — Node puro, sin binarios nativos, funciona
  en el runtime de Next.
- **Audio en disco local** (`storage/audio/`) — sin blob storage externo.
- **Tailwind + componentes propios** — sin librería de componentes pesada.
- **Vitest**, TDD sobre lógica pura, OpenAI mockeado.

## Decisiones descartadas

- **Claude / Anthropic como cerebro** — el usuario prefirió una sola cuenta OpenAI.
- **Whisper local / Groq** para STT — se eligió la API de OpenAI.
- **`SpeechSynthesis` del navegador** para TTS — se eligió `gpt-4o-mini-tts`.
- **Detección automática de unidades** en el PDF — poco fiable; el usuario marca
  los rangos a mano.
- **Barras de "Aspectos a mejorar"** en speaking — requieren análisis más fino;
  spec posterior.
- **Postgres / JSON en disco** para persistencia — SQLite + Prisma es suficiente.
- **Gamificación completa de los mockups** (logros, retos, metas, leaderboard) —
  specs posteriores.

## Próximas specs (no ahora)

1. Gamificación avanzada: logros, retos diarios, metas diarias.
2. Speaking: barras de aspectos, roleplay, shadowing, pronunciación desde audio.
3. Más tipos de ejercicio y repaso espaciado (SRS) de flashcards y vocabulario.
4. Glosario / vocabulario y buscador global.
5. Detección automática de unidades en el PDF.
6. Vista de progreso con gráficas.

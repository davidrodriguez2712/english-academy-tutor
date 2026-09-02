# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Estado del repositorio

Esqueleto funcional de la app (spec `01-esqueleto`).

**Stack:** Next.js 16 (App Router) + TypeScript · Prisma 6 + SQLite · OpenAI SDK · Vitest.

**Comandos:**

- `npm run dev` — servidor de desarrollo
- `npm test` — tests (Vitest; BD y almacenamiento desechables, no toca los datos reales)
- `npm run lint` — ESLint
- `npm run build` — build de producción
- `npm run db:migrate` — `prisma migrate dev`
- `npm run db:studio` — Prisma Studio

**Arquitectura:**

- Todo el acceso a la IA vive tras `src/lib/ai/*`; sin `OPENAI_API_KEY` la app arranca y navega, con las funciones de IA desactivadas (`isAiEnabled()` + `AiDisabledBanner`).
- La lógica pura (gamificación, corrección de ejercicios, normalización, turnos de speaking) está en `src/lib/` y se testea aislada.
- App `force-dynamic` de principio a fin; usuario único, sin login, modelado por una fila `Profile`.

## Flujo spec-driven

El desarrollo de features grandes sigue el método spec-driven, implementado con dos skills:

- **`/spec <descripción>`** — Diseña una spec. Fase de preguntas obligatoria antes de escribir nada. Guarda el resultado en `specs/NN-slug.md` en estado `Borrador`. No escribe código.
- **`/spec-impl <NN-slug>`** — Implementa una spec. Exige que su estado signifique "Aprobado" (el humano lo cambia a mano, nunca el agente). Crea la rama `spec-NN-slug`, muestra el resumen e implementa paso a paso con pausas para revisar diffs. Nunca hace commit automáticamente.

Detalles clave:

- `.claude/skills/spec/template.md` define la estructura obligatoria de toda spec (header con objetivo de una frase, scope con "qué NO entra" explícito, plan de implementación con pasos commiteables, criterios de aceptación booleanos, decisiones tomadas y descartadas).
- La numeración de specs es secuencial con dos dígitos (`01-`, `02-`...). El número siguiente sale del máximo existente en `specs/`.
- `specs/.spec-config.yml` controla `AutoCreateBranch` (default `true`: `/spec-impl` crea la rama sin preguntar; `false`: pide confirmación `[y/N]`).
- Las specs se escriben en el idioma del prompt inicial. Mantén un único conjunto de etiquetas de estado por repo (aquí, español: `Borrador` / `En revisión` / `Aprobado` / `Implementado` / `Obsoleto`).

## Idioma

Todo (specs, respuestas, documentación) en español.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# English Academy Tutor

App web personal para estudiar inglés a partir de tus propios libros (PDF), de
forma gamificada, con un módulo de práctica de speaking asíncrona (grabas audio,
la IA transcribe y corrige). Uso individual, sin login.

## Requisitos

- Node 20+
- Clave de OpenAI (opcional) en `.env.local` (`OPENAI_API_KEY`). Sin ella la app
  arranca y la navegación funciona, pero las funciones de IA (generar ejercicios,
  corregir speaking, TTS) quedan desactivadas con un aviso.

## Puesta en marcha

```bash
cp .env.example .env               # DATABASE_URL para el CLI de Prisma
cp .env.local.example .env.local   # y rellena OPENAI_API_KEY (opcional)
npm install
npx prisma migrate dev
npm run dev
```

Se necesitan **ambos** ficheros: `.env` lo lee el CLI de Prisma 6 y `.env.local`
lo lee Next.js.

## Comandos

- `npm run dev` — servidor de desarrollo
- `npm test` — tests (Vitest)
- `npm run lint` — ESLint
- `npm run build` — build de producción
- `npm run db:migrate` — aplicar migraciones (`prisma migrate dev`)
- `npm run db:studio` — inspeccionar la base de datos (Prisma Studio)

## Flujo

1. **Biblioteca** — sube un PDF con texto seleccionable y marca unidades
   (título + rango de páginas + nivel opcional). Los PDF escaneados se rechazan.
2. **Aprender** — elige una unidad y practica los 5 tipos de ejercicio (opción
   múltiple, rellenar huecos, relacionar, ordenar frases, flashcards). Se generan
   bajo demanda y se cachean; "Regenerar" fuerza uno nuevo. Ganas XP.
3. **Practicar speaking** — conversación guiada (5 turnos) o monólogo libre
   (1 turno sobre un tema escrito). Grabas audio, la IA transcribe, corrige y
   devuelve versión natural, tip de fluidez y audio de la corrección.
4. **Progreso** — XP total, nivel, racha actual y máxima, contadores e historial
   reciente.

## Datos locales

SQLite (`prisma/dev.db`), PDFs en `storage/books/` y audio en `storage/audio/`.
Todo gitignored.

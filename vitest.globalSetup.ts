import { execFileSync } from 'node:child_process'
import { rmSync } from 'node:fs'

// DB de test desechable. `file:./test.db` se resuelve relativo a prisma/schema.prisma,
// asi que el fichero real es prisma/test.db (nunca prisma/dev.db).
const TEST_DATABASE_URL = 'file:./test.db'

export default function setup() {
  for (const f of ['prisma/test.db', 'prisma/test.db-journal']) {
    rmSync(f, { force: true })
  }
  execFileSync(
    'npx',
    ['prisma', 'db', 'push', '--skip-generate'],
    {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    },
  )
}

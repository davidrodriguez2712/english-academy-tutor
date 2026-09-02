import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    globalSetup: ['./vitest.globalSetup.ts'],
    env: {
      // DB y almacenamiento desechables: nunca tocan los datos reales de la app.
      DATABASE_URL: 'file:./test.db',
      STORAGE_ROOT: './storage-test',
    },
  },
})

import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'node',
    // Tests run server code outside React's react-server condition; resolve `server-only` to its no-op build there.
    alias: { 'server-only': fileURLToPath(new URL('./node_modules/server-only/empty.js', import.meta.url)) },
    include: ['tests/unit/**/*.test.ts', 'tests/int/**/*.int.spec.ts'],
    env: {
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? 'postgres://postgres:postgres@127.0.0.1:5434/genix_test',
      PAYLOAD_SECRET: 'test-secret-not-for-production',
      ROOT_DOMAIN: 'thegenixgroup.com',
    },
    fileParallelism: false,
    // A cold Payload import on the first run can exceed the 5 s / 10 s defaults.
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
})

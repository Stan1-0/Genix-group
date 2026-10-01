import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'node',
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

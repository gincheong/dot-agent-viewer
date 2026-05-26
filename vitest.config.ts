import { defineConfig } from 'vitest/config'

// Scanner tests run in plain Node; component / store tests run in jsdom so
// React DOM + zustand work. Per-glob env (Vitest v4 deprecates the legacy
// `environmentMatchGlobs`; we use the v4-style `environmentOptions` + the
// `// @vitest-environment jsdom` directive at the top of files that need it).
//
// To keep the config simple and explicit, the `// @vitest-environment jsdom`
// comment is used in:
//   - tests/unit/store/useAppStore.test.ts
//   - tests/unit/components/*.test.tsx
export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'tests/unit/**/*.test.ts',
      'tests/unit/**/*.test.tsx',
    ],
    benchmark: {
      include: ['tests/perf/**/*.bench.ts'],
    },
  },
})

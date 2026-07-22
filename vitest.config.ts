import { defineConfig } from 'vitest/config'

export default defineConfig({
  // Alguns módulos referenciam a flag de build do mock; nos testes ela é falsa.
  define: {
    __USE_MOCK_API__: 'false'
  },
  test: {
    environment: 'node',
    // Stub de localStorage (o mock de homologação usa no carregamento).
    setupFiles: ['./test/setup.ts'],
    include: ['src/**/*.test.ts', 'test/**/*.test.ts']
  }
})

import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

// Dois níveis da pirâmide em projects separados:
//   unit        → lógica pura e regras do mock (Node, sem a flag do mock).
//   integration → stores e componentes contra o mock via apiClient (jsdom,
//                 com __USE_MOCK_API__ ligado para o apiClient rotear ao mock).
export default defineConfig({
  test: {
    projects: [
      {
        define: { __USE_MOCK_API__: 'false' },
        test: {
          name: 'unit',
          environment: 'node',
          include: ['src/**/*.test.ts'],
          setupFiles: ['./test/setup.ts']
        }
      },
      {
        plugins: [vue()],
        define: { __USE_MOCK_API__: 'true' },
        test: {
          name: 'integration',
          environment: 'jsdom',
          include: ['test/integration/**/*.test.ts'],
          setupFiles: ['./test/setup.ts']
        }
      }
    ]
  }
})

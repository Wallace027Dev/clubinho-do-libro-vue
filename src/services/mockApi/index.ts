/**
 * Ponte entre o `apiClient` e o mock de homologação. Este módulo (e tudo que
 * ele importa) só é carregado quando o mock está ligado — o `apiClient` faz
 * um `import()` dinâmico atrás de `__USE_MOCK_API__`, então nada disto entra
 * no bundle de produção.
 */
import { handleMockRequest, type MockResponse } from './handlers'

export { resetMockDb } from './db'

/** Executa uma "requisição" contra o mock a partir do path + options do fetch. */
export function runMock(path: string, options: RequestInit = {}): MockResponse {
  const method = options.method ?? 'GET'

  let body: Record<string, unknown> = {}
  if (typeof options.body === 'string' && options.body) {
    try {
      body = JSON.parse(options.body) as Record<string, unknown>
    } catch {
      body = {}
    }
  }

  return handleMockRequest(method, path, body)
}

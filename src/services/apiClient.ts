export interface ApiErrorBody {
  error?: string
}

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  // Homologação: em vez do backend real, atende pelo "banco" em memória do
  // navegador. O import é dinâmico e fica atrás da flag de build, então o
  // bundle de produção não carrega nada do mock.
  if (__USE_MOCK_API__) {
    const { runMock } = await import('./mockApi')
    const { status, body } = runMock(path, options)

    if (status < 200 || status >= 300) {
      const errorBody = body as ApiErrorBody
      throw new ApiError(status, errorBody?.error || 'Erro inesperado.')
    }

    return body as T
  }

  const response = await fetch(path, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  })

  const body = (await response.json().catch(() => ({}))) as ApiErrorBody

  if (!response.ok) {
    throw new ApiError(response.status, body.error || 'Erro inesperado.')
  }

  return body as T
}

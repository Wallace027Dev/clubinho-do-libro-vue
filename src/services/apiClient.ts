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

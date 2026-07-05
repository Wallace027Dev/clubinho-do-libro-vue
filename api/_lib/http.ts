export function sendJson(res: any, status: number, body: unknown) {
  res.status(status).json(body)
}

export function assertMethod(req: any, res: any, methods: string[]): boolean {
  if (methods.includes(req.method)) {
    return true
  }

  res.setHeader('Allow', methods.join(', '))
  sendJson(res, 405, { error: 'Method not allowed.' })
  return false
}

export function readBody<T>(req: any): T {
  return typeof req.body === 'string' ? JSON.parse(req.body) : req.body
}

export function getRequiredEnv(name: string): string {
  const value = process.env[name]

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

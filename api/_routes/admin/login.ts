import { createSession, setSessionCookie } from '../../_lib/auth.js'
import { assertMethod, getRequiredEnv, readBody, sendJson } from '../../_lib/http.js'
import { clearAttempts, clientIp, isRateLimited, recordFailure } from '../../_lib/rateLimit.js'

interface AdminLoginBody {
  password?: string
}

export default async function handler(req: any, res: any) {
  if (!assertMethod(req, res, ['POST'])) {
    return
  }

  const rateKey = `admin:${clientIp(req)}`
  const limit = isRateLimited(rateKey)
  if (limit.limited) {
    res.setHeader?.('Retry-After', String(limit.retryAfterSec))
    sendJson(res, 429, { error: `Muitas tentativas. Tente novamente em ${limit.retryAfterSec}s.` })
    return
  }

  const body = readBody<AdminLoginBody>(req)

  if (!body.password || body.password !== getRequiredEnv('ADMIN_PASSWORD')) {
    recordFailure(rateKey)
    sendJson(res, 401, { error: 'Senha administrativa inválida.' })
    return
  }

  clearAttempts(rateKey)

  const token = await createSession({ userId: null, role: 'ADMIN' })
  setSessionCookie(res, token)
  sendJson(res, 200, { user: { id: null, login: 'admin', role: 'ADMIN', displayName: 'Admin' } })
}

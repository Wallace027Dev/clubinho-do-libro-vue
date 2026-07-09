import { createSession, setSessionCookie } from '../../_lib/auth.js'
import { assertMethod, getRequiredEnv, readBody, sendJson } from '../../_lib/http.js'

interface AdminLoginBody {
  password?: string
}

export default async function handler(req: any, res: any) {
  if (!assertMethod(req, res, ['POST'])) {
    return
  }

  const body = readBody<AdminLoginBody>(req)

  if (!body.password || body.password !== getRequiredEnv('ADMIN_PASSWORD')) {
    sendJson(res, 401, { error: 'Senha administrativa invalida.' })
    return
  }

  const token = await createSession({ userId: null, role: 'ADMIN' })
  setSessionCookie(res, token)
  sendJson(res, 200, { user: { id: null, login: 'admin', role: 'ADMIN', displayName: 'Admin' } })
}

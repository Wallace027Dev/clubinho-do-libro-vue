import { clearSessionCookie } from '../../_lib/auth.js'
import { assertMethod, sendJson } from '../../_lib/http.js'

export default function handler(req: any, res: any) {
  if (!assertMethod(req, res, ['POST'])) {
    return
  }

  clearSessionCookie(res)
  sendJson(res, 200, { ok: true })
}

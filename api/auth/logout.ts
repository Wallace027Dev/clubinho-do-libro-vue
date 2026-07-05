import { clearSessionCookie } from '../_lib/auth'
import { assertMethod, sendJson } from '../_lib/http'

export default function handler(req: any, res: any) {
  if (!assertMethod(req, res, ['POST'])) {
    return
  }

  clearSessionCookie(res)
  sendJson(res, 200, { ok: true })
}

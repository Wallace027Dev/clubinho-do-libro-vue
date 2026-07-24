import { requireAdmin } from '../../../_lib/auth.js'
import { assertMethod, readBody, sendJson } from '../../../_lib/http.js'
import { adminMembersRepository } from '../../../_lib/repositories/adminMembersRepository.js'
import { updateMember } from '../../../../src/domain/services/adminMembers.js'

interface UpdateUserBody {
  deactivated?: boolean
  newPassword?: string
}

/**
 * Gestão de um membro pelo admin. Regras no domínio
 * (`src/domain/services/adminMembers.ts`):
 * - deactivated true/false: soft delete (preserva histórico).
 * - newPassword: redefine a senha provisória (mínimo 6 caracteres).
 */
export default async function handler(req: any, res: any) {
  if (!assertMethod(req, res, ['PATCH'])) {
    return
  }

  const session = await requireAdmin(req, res)

  if (!session) {
    return
  }

  const body = readBody<UpdateUserBody>(req)
  const result = await updateMember(adminMembersRepository(), {
    userId: req.query.userId as string,
    rawDeactivated: body.deactivated,
    rawNewPassword: body.newPassword
  })

  if (!result.ok) {
    sendJson(res, result.status, { error: result.error })
    return
  }

  sendJson(res, 200, { user: result.user })
}

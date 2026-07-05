import { requireSession } from './_lib/auth'
import { getDefaultClub } from './_lib/club'
import { assertMethod, readBody, sendJson } from './_lib/http'
import { prisma } from './_lib/prisma'

interface ProfileBody {
  displayName?: string
  avatarUrl?: string
}

export default async function handler(req: any, res: any) {
  if (!assertMethod(req, res, ['PATCH'])) {
    return
  }

  const session = await requireSession(req, res)

  if (!session || !session.userId) {
    return
  }

  const body = readBody<ProfileBody>(req)
  const displayName = body.displayName?.trim()
  const avatarUrl = body.avatarUrl?.trim()

  const user = await prisma.user.update({
    where: { id: session.userId },
    data: {
      displayName: displayName || null,
      avatarUrl: avatarUrl || null
    },
    select: {
      id: true,
      login: true,
      role: true,
      displayName: true,
      avatarUrl: true
    }
  })

  const club = await getDefaultClub()
  await prisma.activity.create({
    data: {
      clubId: club.id,
      actorId: user.id,
      type: 'PROFILE_UPDATED',
      message: `${user.displayName || user.login} atualizou o perfil.`
    }
  })

  sendJson(res, 200, { user })
}

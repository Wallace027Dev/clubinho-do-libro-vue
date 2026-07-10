import { requireSession } from '../_lib/auth.js'
import { getDefaultClub } from '../_lib/club.js'
import { assertMethod, readBody, sendJson } from '../_lib/http.js'
import { prisma } from '../_lib/prisma.js'

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

  // A foto chega como data URL comprimida pelo front (~256px). O limite
  // evita abusos que inflariam a linha do usuario no banco.
  if (avatarUrl && avatarUrl.length > 400_000) {
    sendJson(res, 400, { error: 'Imagem muito grande. Escolha uma foto menor.' })
    return
  }

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

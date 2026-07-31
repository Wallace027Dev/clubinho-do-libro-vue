import { requireSession } from '../../_lib/auth.js'
import { assertMethod, sendJson } from '../../_lib/http.js'
import { prisma } from '../../_lib/prisma.js'

/**
 * Contadores vitalícios do membro logado, somando **todos** os livros do clube
 * (o atual e os arquivados).
 *
 * Por que no servidor: o front não consegue somar isso sozinho — o payload do
 * livro atual não traz comentários, e o histórico só devolve livros
 * finalizados. Contar no cliente dava sempre 0 enquanto o livro estava em
 * leitura.
 */
export default async function handler(req: any, res: any) {
  if (!assertMethod(req, res, ['GET'])) {
    return
  }

  const session = await requireSession(req, res)

  if (!session || !session.userId) {
    return
  }

  const [chaptersRead, comments] = await Promise.all([
    prisma.chapterProgress.count({ where: { userId: session.userId, status: 'FINISHED' } }),
    prisma.chapterComment.count({ where: { userId: session.userId } })
  ])

  sendJson(res, 200, { chaptersRead, comments })
}

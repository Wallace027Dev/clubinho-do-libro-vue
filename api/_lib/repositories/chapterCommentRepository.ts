/**
 * Adaptador Prisma do repositório de comentário de capítulo (contrato em
 * `src/domain/services/chapterComment.ts`). Só persistência/serialização:
 * resolve o gate anti-spoiler, grava comentário + atividade em transação e
 * serializa a lista de comentários no formato de resposta.
 */
import type { Prisma } from '@prisma/client'
import { getFinishedChapterForUser } from '../chapterAccess.js'
import { getDefaultClub } from '../club.js'
import { prisma } from '../prisma.js'
import { countReactionTypes } from '../../../src/domain/reactions.js'
import type {
  ChapterCommentCommand,
  ChapterCommentRepository
} from '../../../src/domain/services/chapterComment.js'

async function serializeComments(chapterId: string, viewerId: string) {
  const comments = await prisma.chapterComment.findMany({
    where: { chapterId },
    orderBy: { createdAt: 'asc' },
    include: {
      user: { select: { id: true, login: true, displayName: true, avatarUrl: true } },
      reactions: { orderBy: { updatedAt: 'desc' } }
    }
  })

  return comments.map((comment) => ({
    id: comment.id,
    body: comment.body,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
    user: comment.user,
    myReaction: comment.reactions.find((reaction) => reaction.userId === viewerId)?.type ?? null,
    reactions: countReactionTypes(comment.reactions),
    reactionTotal: comment.reactions.length,
    recentReactions: comment.reactions.slice(0, 6).map((reaction) => ({
      type: reaction.type,
      updatedAt: reaction.updatedAt
    }))
  }))
}

type SerializedComments = Awaited<ReturnType<typeof serializeComments>>

export function chapterCommentRepository(): ChapterCommentRepository<SerializedComments> {
  return {
    async getFinishedChapter(chapterId, userId) {
      const access = await getFinishedChapterForUser(chapterId, userId)
      return access
        ? { id: access.chapter.id, number: access.chapter.number, title: access.chapter.title }
        : null
    },

    async getActor(userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } })
      return user ? { displayName: user.displayName, login: user.login } : null
    },

    async commitComment(command: ChapterCommentCommand) {
      const club = await getDefaultClub()

      await prisma.$transaction(async (tx) => {
        const existing = await tx.chapterComment.findUnique({
          where: { chapterId_userId: { chapterId: command.chapterId, userId: command.userId } },
          select: { id: true }
        })

        await tx.chapterComment.upsert({
          where: { chapterId_userId: { chapterId: command.chapterId, userId: command.userId } },
          update: { body: command.body },
          create: { chapterId: command.chapterId, userId: command.userId, body: command.body }
        })

        // A atividade do feed nasce só quando o comentário é NOVO. Editar
        // atualiza o texto (o card do feed lê o corpo atual), mas não cria uma
        // segunda atividade — senão o mesmo comentário vira dois cards no feed.
        if (!existing) {
          await tx.activity.create({
            data: {
              clubId: club.id,
              actorId: command.userId,
              type: command.activity.type,
              message: command.activity.message,
              metadata: command.activity.metadata as unknown as Prisma.InputJsonObject
            }
          })
        }
      })
    },

    listComments: serializeComments
  }
}

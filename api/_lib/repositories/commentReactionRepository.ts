/**
 * Adaptador Prisma do repositório de reação a comentário (contrato em
 * `src/domain/services/commentReaction.ts`). Só persistência: o gate
 * anti-spoiler é `userCanReadComment` e a gravação é um upsert.
 */
import { userCanReadComment } from '../chapterAccess.js'
import { prisma } from '../prisma.js'
import type {
  CommentReactionCommand,
  CommentReactionRepository
} from '../../../src/domain/services/commentReaction.js'

type PrismaReaction = Awaited<ReturnType<typeof prisma.chapterCommentReaction.upsert>>

export function commentReactionRepository(): CommentReactionRepository<PrismaReaction> {
  return {
    async canReact(commentId, userId) {
      return Boolean(await userCanReadComment(commentId, userId))
    },

    async saveReaction(command: CommentReactionCommand) {
      return prisma.chapterCommentReaction.upsert({
        where: { commentId_userId: { commentId: command.commentId, userId: command.userId } },
        update: { type: command.type },
        create: { commentId: command.commentId, userId: command.userId, type: command.type }
      })
    }
  }
}

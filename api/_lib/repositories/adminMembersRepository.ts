/**
 * Adaptador Prisma da administração de membros (contrato em
 * `src/domain/services/adminMembers.ts`). Só persistência: checa login
 * duplicado, aplica o hash da senha e o `deactivatedAt`, e registra a atividade
 * de novo membro.
 */
import type { Prisma } from '@prisma/client'
import { getDefaultClub } from '../club.js'
import { hashPassword } from '../passwords.js'
import { prisma } from '../prisma.js'
import type {
  AdminMembersRepository,
  CreateUserCommand,
  UpdateUserCommand
} from '../../../src/domain/services/adminMembers.js'

const memberSelect = {
  id: true,
  login: true,
  role: true,
  displayName: true,
  avatarUrl: true,
  deactivatedAt: true,
  createdAt: true
} as const

type MemberView = Prisma.UserGetPayload<{ select: typeof memberSelect }>

export function adminMembersRepository(): AdminMembersRepository<MemberView> {
  return {
    async isLoginTaken(login) {
      const existing = await prisma.user.findUnique({ where: { login }, select: { id: true } })
      return Boolean(existing)
    },

    async createMember(command: CreateUserCommand) {
      const club = await getDefaultClub()
      const user = await prisma.user.create({
        data: {
          login: command.login,
          passwordHash: await hashPassword(command.password),
          displayName: command.displayName
        },
        select: memberSelect
      })

      await prisma.activity.create({
        data: {
          clubId: club.id,
          type: command.activity.type,
          message: command.activity.message,
          metadata: { userId: user.id }
        }
      })

      return user
    },

    async memberExists(userId) {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } })
      return Boolean(user)
    },

    async updateMember(command: UpdateUserCommand) {
      const data: { deactivatedAt?: Date | null; passwordHash?: string } = {}

      if (command.changes.deactivated !== undefined) {
        data.deactivatedAt = command.changes.deactivated ? new Date() : null
      }

      if (command.changes.newPassword !== undefined) {
        data.passwordHash = await hashPassword(command.changes.newPassword)
      }

      return prisma.user.update({ where: { id: command.userId }, data, select: memberSelect })
    }
  }
}

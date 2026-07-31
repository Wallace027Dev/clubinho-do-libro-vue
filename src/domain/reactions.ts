/**
 * Camada de domínio — tipos de reação a comentário.
 *
 * Fonte única da lista de reações válidas, espelhando o enum
 * `ChapterCommentReactionType` do Prisma. Consumida pela validação do backend
 * real e do mock — nunca redigitada solta.
 */

export type ReactionType = 'GOSTEI' | 'SOFRI' | 'SURPRESO' | 'SUSPEITO' | 'DISCUTIR'

export const REACTION_TYPES: readonly ReactionType[] = [
  'GOSTEI',
  'SOFRI',
  'SURPRESO',
  'SUSPEITO',
  'DISCUTIR'
]

/** Uma reação é válida quando é uma das do clube. */
export function isValidReactionType(value: unknown): value is ReactionType {
  return typeof value === 'string' && (REACTION_TYPES as readonly string[]).includes(value)
}

/**
 * Quantas reações de cada tipo. Tipo sem nenhuma reação não entra no resultado,
 * então a UI itera só o que existe.
 */
export function countReactionTypes(
  types: readonly { type: string }[] | readonly string[]
): Partial<Record<ReactionType, number>> {
  return types.reduce<Partial<Record<ReactionType, number>>>((acc, item) => {
    const type = typeof item === 'string' ? item : item.type

    if (isValidReactionType(type)) {
      acc[type] = (acc[type] ?? 0) + 1
    }

    return acc
  }, {})
}

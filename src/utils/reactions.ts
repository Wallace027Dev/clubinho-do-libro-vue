import type { ChapterCommentReactionType } from '../types/platform'

export interface ReactionOption {
  type: ChapterCommentReactionType
  emoji: string
  label: string
}

/**
 * As cinco reações disponíveis, na ordem de exibição.
 *
 * O `type` é o enum do banco e não muda (nada de migration); emoji e rótulo são
 * só o que a pessoa vê, e andam juntos — rótulo "sofri" com 😂 confundiria, já
 * que o rótulo vira o aria-label ("Reagir com …").
 */
export const reactionOptions: ReactionOption[] = [
  { type: 'GOSTEI', emoji: '❤️', label: 'amei' },
  { type: 'SOFRI', emoji: '😂', label: 'engraçado' },
  { type: 'SURPRESO', emoji: '😮', label: 'surpresa' },
  { type: 'SUSPEITO', emoji: '😢', label: 'triste' },
  { type: 'DISCUTIR', emoji: '😡', label: 'revoltado' }
]

const byType = new Map(reactionOptions.map((option) => [option.type, option]))

export function reactionEmoji(type: ChapterCommentReactionType): string {
  return byType.get(type)?.emoji ?? '❤️'
}

export function reactionLabel(type: ChapterCommentReactionType): string {
  return byType.get(type)?.label ?? 'reação'
}

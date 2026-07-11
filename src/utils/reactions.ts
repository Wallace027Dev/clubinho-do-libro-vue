import type { ChapterCommentReactionType } from '../types/platform'

export interface ReactionOption {
  type: ChapterCommentReactionType
  emoji: string
  label: string
}

/** As cinco reações disponíveis, na ordem de exibição. */
export const reactionOptions: ReactionOption[] = [
  { type: 'GOSTEI', emoji: '🙂', label: 'gostei' },
  { type: 'SOFRI', emoji: '😟', label: 'sofri' },
  { type: 'SURPRESO', emoji: '😮', label: 'surpresa' },
  { type: 'SUSPEITO', emoji: '🤨', label: 'suspeito' },
  { type: 'DISCUTIR', emoji: '💬', label: 'discutir' }
]

const byType = new Map(reactionOptions.map((option) => [option.type, option]))

export function reactionEmoji(type: ChapterCommentReactionType): string {
  return byType.get(type)?.emoji ?? '🙂'
}

export function reactionLabel(type: ChapterCommentReactionType): string {
  return byType.get(type)?.label ?? 'reação'
}

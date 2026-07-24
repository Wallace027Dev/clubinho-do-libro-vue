/**
 * Camada de domínio — canais de atividade.
 *
 * Cada tipo de atividade pertence a um canal:
 * - `feed`  → descoberta: progresso de leitura e marcos do clube.
 * - `bell`  → notificações acionáveis (comentário; menção no futuro).
 * - `hidden`→ ruído que não aparece em nenhum dos dois (ex.: "iniciou capítulo").
 *
 * Fonte única consumida pelo backend real e pelo mock, para o feed e o sininho
 * mostrarem exatamente os mesmos tipos dos dois lados.
 */

export type ActivityChannel = 'feed' | 'bell' | 'hidden'

/** Notificações acionáveis (sininho). */
export const BELL_ACTIVITY_TYPES = ['CHAPTER_COMMENTED'] as const

/** Ruído: não entra no feed nem no sininho. */
export const HIDDEN_ACTIVITY_TYPES = ['CHAPTER_STARTED'] as const

/** Feed de descoberta: progresso dos membros e marcos do clube. */
export const FEED_ACTIVITY_TYPES = [
  'MEMBER_CREATED',
  'PROFILE_UPDATED',
  'BOOK_SELECTED',
  'BOOK_FINISHED',
  'BOOK_REVIEWED',
  'CHAPTER_FINISHED'
] as const

/** Canal a que um tipo de atividade pertence. */
export function activityChannel(type: string): ActivityChannel {
  if ((BELL_ACTIVITY_TYPES as readonly string[]).includes(type)) {
    return 'bell'
  }

  if ((HIDDEN_ACTIVITY_TYPES as readonly string[]).includes(type)) {
    return 'hidden'
  }

  return 'feed'
}

export function isFeedActivity(type: string): boolean {
  return activityChannel(type) === 'feed'
}

export function isBellActivity(type: string): boolean {
  return activityChannel(type) === 'bell'
}

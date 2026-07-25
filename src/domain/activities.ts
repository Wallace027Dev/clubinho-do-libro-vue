/**
 * Camada de domínio — canais de atividade.
 *
 * Cada tipo de atividade pertence a um canal:
 * - `feed`  → **comentários** dos capítulos, mostrados na página /feed (só de
 *             outras pessoas e de capítulos que o membro já concluiu — filtro
 *             feito na borda, com os dados do banco).
 * - `alert` → **progresso e marcos** (começo/fim de capítulo, seleção/fim de
 *             livro, avaliação, novo membro): o log do sininho, num modal.
 * - `hidden`→ ruído que não aparece em nenhum lugar (ex.: "atualizou perfil").
 *
 * Fonte única consumida pelo backend real e pelo mock. Os filtros por usuário
 * (só de outros; anti-spoiler do feed) dependem do banco e ficam na borda.
 */

export type ActivityChannel = 'feed' | 'alert' | 'hidden'

/** Feed: comentários (acionáveis; abrem a página do comentário). */
export const FEED_ACTIVITY_TYPES = ['CHAPTER_COMMENTED'] as const

/** Sininho/alerta: progresso da leitura e marcos do clube. */
export const ALERT_ACTIVITY_TYPES = [
  'CHAPTER_STARTED',
  'CHAPTER_FINISHED',
  'BOOK_SELECTED',
  'BOOK_FINISHED',
  'BOOK_REVIEWED',
  'MEMBER_CREATED'
] as const

/** Ruído: não entra no feed nem no sininho. */
export const HIDDEN_ACTIVITY_TYPES = ['PROFILE_UPDATED'] as const

/** Canal a que um tipo de atividade pertence. */
export function activityChannel(type: string): ActivityChannel {
  if ((FEED_ACTIVITY_TYPES as readonly string[]).includes(type)) {
    return 'feed'
  }

  if ((ALERT_ACTIVITY_TYPES as readonly string[]).includes(type)) {
    return 'alert'
  }

  return 'hidden'
}

export function isFeedActivity(type: string): boolean {
  return activityChannel(type) === 'feed'
}

export function isAlertActivity(type: string): boolean {
  return activityChannel(type) === 'alert'
}

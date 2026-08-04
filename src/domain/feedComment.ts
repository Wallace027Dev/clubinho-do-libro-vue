/**
 * Camada de domínio — visibilidade do comentário no feed (anti-spoiler).
 *
 * Fonte única da regra que decide, para o feed do clube, se o comentário de
 * outro membro aparece **destravado** (com um trecho do texto) ou **travado**
 * (com cadeado, sem o texto) para quem está olhando. A regra: só quem já
 * concluiu aquele capítulo lê o comentário; quem não concluiu vê que existe
 * comentário, mas não o conteúdo.
 *
 * Consumida pelo backend real (`api/_lib/feedActivities.ts`) e pelo mock
 * (`src/services/mockApi/handlers.ts`) — nunca duplicada. Função pura, sem I/O.
 *
 * Garantia importante: quando `locked` é `true`, `bodyPreview` é sempre `null`.
 * A borda usa isso para **não enviar o corpo do comentário** de capítulo não
 * concluído — o texto travado não pode sequer trafegar, senão o spoiler vaza no
 * payload de rede mesmo com o cadeado na tela.
 */

/** Tamanho máximo do trecho exibido no card do feed (em caracteres). */
export const COMMENT_PREVIEW_LENGTH = 140

/**
 * Trecho de uma linha para o card do feed: colapsa espaços/quebras e corta em
 * `maxLength`, acrescentando reticências quando trunca.
 */
export function commentPreview(body: string, maxLength = COMMENT_PREVIEW_LENGTH): string {
  const normalized = body.replace(/\s+/gu, ' ').trim()

  if (normalized.length <= maxLength) {
    return normalized
  }

  return `${normalized.slice(0, maxLength).trimEnd()}…`
}

/** Decisão de visibilidade de um comentário no feed, para um espectador. */
export interface FeedCommentView {
  /** `true` quando o espectador ainda não concluiu o capítulo do comentário. */
  locked: boolean
  /** Trecho do texto — sempre `null` quando `locked` (o corpo não sai travado). */
  bodyPreview: string | null
}

/**
 * Decide se o comentário aparece travado ou destravado para o espectador.
 *
 * @param finishedChapterIds capítulos que o espectador já concluiu.
 * @param chapterId capítulo do comentário (do metadata da atividade).
 * @param body corpo do comentário (só usado — e revelado — se destravado).
 */
export function feedCommentView(input: {
  finishedChapterIds: ReadonlySet<string>
  chapterId: string | null | undefined
  body: string | null | undefined
}): FeedCommentView {
  const locked = !input.chapterId || !input.finishedChapterIds.has(input.chapterId)

  if (locked) {
    return { locked: true, bodyPreview: null }
  }

  const body = typeof input.body === 'string' ? input.body : ''
  return { locked: false, bodyPreview: body.trim() ? commentPreview(body) : null }
}

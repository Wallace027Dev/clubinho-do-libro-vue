/**
 * Camada de domínio — notificações (web push).
 *
 * Fonte única do **conteúdo** de cada notificação e das **regras de alvo** (quem
 * recebe). Funções puras, consumidas pelo backend real (envio via web-push) e
 * pelo mock (simulação local) — nunca duplicadas. A entrega em si (web-push /
 * Notification API) fica na borda.
 */

/** Conteúdo de uma notificação, agnóstico ao meio de entrega. */
export interface NotificationPayload {
  title: string
  body: string
  /** Rota interna aberta ao tocar na notificação. */
  url: string
  /** Agrupa/subsitui notificações do mesmo tipo. */
  tag?: string
}

/** Membro na forma mínima que as regras de alvo precisam. */
export interface NotifiableMember {
  id: string
  deactivatedAt: Date | string | null
}

/**
 * Ids dos membros ativos que devem receber a notificação, opcionalmente
 * excluindo quem disparou o evento (não faz sentido notificar a si mesmo).
 */
export function activeMemberIds(
  members: readonly NotifiableMember[],
  excludeUserId?: string | null
): string[] {
  return members
    .filter((member) => !member.deactivatedAt && member.id !== excludeUserId)
    .map((member) => member.id)
}

/** Remove um usuário (ex.: quem disparou o evento) de uma lista de ids. */
export function excludeUser(userIds: readonly string[], excludeUserId?: string | null): string[] {
  return userIds.filter((id) => id !== excludeUserId)
}

/**
 * Rota da página da interação. Tocar na notificação leva à atividade em si — que
 * mostra o que a pessoa fez naquele capítulo e o comentário dela, se houver — em
 * vez de despejar quem clicou numa lista genérica. Sem a atividade resolvida,
 * cai no `fallback`.
 */
export function activityUrl(activityId: string | null | undefined, fallback: string): string {
  return activityId ? `/activity/${activityId}` : fallback
}

/**
 * Membro concluiu um capítulo → demais membros ativos. `chapterLabel` já vem
 * pronto (ex.: "o capítulo 3", "o prólogo").
 */
export function chapterFinishedNotification(
  actorName: string,
  chapterLabel: string,
  activityId?: string | null
): NotificationPayload {
  return {
    title: 'Avanço na leitura 📚',
    body: `${actorName} terminou ${chapterLabel}.`,
    url: activityUrl(activityId, '/feed'),
    tag: 'chapter-finished'
  }
}

/** Clube finalizou o livro → todos os membros ativos. */
export function bookFinishedNotification(bookTitle: string): NotificationPayload {
  return {
    title: 'Livro finalizado 🎉',
    body: `O clube terminou ${bookTitle}!`,
    url: '/history',
    tag: 'book-finished'
  }
}

/**
 * Novo comentário num capítulo → apenas quem **já concluiu** aquele capítulo
 * (anti-spoiler), menos o autor. A regra de "quem concluiu" é resolvida na
 * borda; o conteúdo mora aqui.
 */
export function chapterCommentNotification(
  actorName: string,
  chapterLabel: string,
  activityId?: string | null
): NotificationPayload {
  return {
    title: 'Novo comentário 💬',
    body: `${actorName} comentou ${chapterLabel}.`,
    url: activityUrl(activityId, '/feed'),
    tag: 'chapter-comment'
  }
}

/**
 * Reação num comentário → **só o autor do comentário**. Ninguém é notificado por
 * reagir a si mesmo (a borda cuida de excluir esse caso).
 *
 * O `tag` inclui o comentário para que reações em comentários diferentes não se
 * substituam na bandeja.
 */
export function commentReactionNotification(
  actorName: string,
  chapterLabel: string,
  commentId: string,
  activityId?: string | null
): NotificationPayload {
  return {
    title: 'Reagiram ao seu comentário 😍',
    // "sobre o capítulo 3" / "sobre o prólogo": o rótulo já vem com artigo.
    body: `${actorName} reagiu ao seu comentário sobre ${chapterLabel}.`,
    url: activityUrl(activityId, '/chapters'),
    tag: `comment-reaction:${commentId}`
  }
}

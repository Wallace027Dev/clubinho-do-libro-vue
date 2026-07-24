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

/** Novo livro do mês → todos os membros ativos. */
export function bookSelectedNotification(bookTitle: string): NotificationPayload {
  return {
    title: 'Novo livro do mês 📖',
    body: `${bookTitle} virou o livro atual do clube. Bora ler!`,
    url: '/',
    tag: 'book-selected'
  }
}

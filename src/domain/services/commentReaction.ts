/**
 * Serviço de domínio — reação a comentário.
 *
 * Núcleo puro (`resolveCommentReaction`) com o gate anti-spoiler (só reage quem
 * concluiu o capítulo do comentário) e a validação do tipo de reação; porta
 * `CommentReactionRepository`; orquestrador assíncrono para o backend real. O
 * mock reusa o núcleo direto e permanece síncrono.
 */
import { isValidReactionType, type ReactionType } from '../reactions'

/** Valor que pode vir pronto (mock) ou como promessa (Prisma). */
export type Awaitable<T> = T | Promise<T>

/** Mensagem do gate anti-spoiler para reação. */
export const REACTION_LOCKED_ERROR = 'Reação liberada apenas para quem concluiu o capítulo.'

/** Comando de gravação da reação (upsert por comentário/membro). */
export interface CommentReactionCommand {
  commentId: string
  userId: string
  type: ReactionType
}

/** Decisão do núcleo: erro HTTP ou comando pronto para persistir. */
export type CommentReactionDecision =
  | { ok: false; status: number; error: string }
  | { ok: true; command: CommentReactionCommand }

/** Contrato de persistência da reação, implementado por cada backend. */
export interface CommentReactionRepository<TReaction> {
  /**
   * O membro pode reagir a este comentário? (comentário existe e o capítulo
   * dele está liberado — concluído e do livro atual). `false` → 403.
   */
  canReact(commentId: string, userId: string): Awaitable<boolean>
  /** Grava a reação (upsert) e devolve o registro salvo. */
  saveReaction(command: CommentReactionCommand): Awaitable<TReaction>
}

/**
 * Núcleo puro e síncrono: aplica o gate anti-spoiler e valida o tipo, devolvendo
 * o comando ou o erro. Recebe se o comentário está liberado (`canReact`).
 */
export function resolveCommentReaction(input: {
  canReact: boolean
  commentId: string
  userId: string
  rawType: unknown
}): CommentReactionDecision {
  if (!input.canReact) {
    return { ok: false, status: 403, error: REACTION_LOCKED_ERROR }
  }

  if (!isValidReactionType(input.rawType)) {
    return { ok: false, status: 400, error: 'Reação inválida.' }
  }

  return { ok: true, command: { commentId: input.commentId, userId: input.userId, type: input.rawType } }
}

/** Resultado do orquestrador: reação salva ou erro HTTP. */
export type CommentReactionResult<TReaction> =
  | { ok: true; reaction: TReaction }
  | { ok: false; status: number; error: string }

/**
 * Orquestrador assíncrono para o backend real: checa o gate pelo repositório,
 * decide pelo núcleo e grava. O mock não usa (chama `resolveCommentReaction`
 * direto) para permanecer síncrono.
 */
export async function reactToComment<TReaction>(
  repo: CommentReactionRepository<TReaction>,
  input: { commentId: string; userId: string; rawType: unknown }
): Promise<CommentReactionResult<TReaction>> {
  const canReact = await repo.canReact(input.commentId, input.userId)

  const decision = resolveCommentReaction({
    canReact,
    commentId: input.commentId,
    userId: input.userId,
    rawType: input.rawType
  })

  if (!decision.ok) {
    return decision
  }

  const reaction = await repo.saveReaction(decision.command)
  return { ok: true, reaction }
}

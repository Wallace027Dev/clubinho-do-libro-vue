/**
 * Serviço de domínio — comentário de capítulo.
 *
 * Mesmo padrão dos demais serviços: núcleo puro (`resolveChapterComment`) com o
 * gate anti-spoiler (só comenta quem concluiu) e a validação do texto,
 * devolvendo um comando; porta `ChapterCommentRepository` para a persistência e
 * a serialização da lista (que muda por lado); orquestradores assíncronos para
 * o backend real. O mock reusa o núcleo direto e permanece síncrono.
 */
import { chapterMessageLabel } from '../chapterLabel'

/** Valor que pode vir pronto (mock) ou como promessa (Prisma). */
export type Awaitable<T> = T | Promise<T>

/** Tamanho máximo do comentário (em caracteres). */
export const MAX_COMMENT_LENGTH = 420

/** Capítulo liberado para comentário, na forma mínima que a decisão precisa. */
export interface ChapterCommentChapter {
  id: string
  number: number
  title: string
}

/** Autor do comentário, para compor a mensagem do feed. */
export interface ChapterCommentActor {
  displayName: string | null
  login: string
}

/** Comando de gravação do comentário (upsert + atividade no feed). */
export interface ChapterCommentCommand {
  chapterId: string
  userId: string
  body: string
  activity: {
    type: 'CHAPTER_COMMENTED'
    message: string
    metadata: { chapterId: string; chapterNumber: number; chapterTitle: string }
  }
}

/** Decisão do núcleo: erro HTTP ou comando pronto para persistir. */
export type ChapterCommentDecision =
  | { ok: false; status: number; error: string }
  | { ok: true; command: ChapterCommentCommand }

/** Mensagem do gate anti-spoiler, reusada na leitura e na escrita. */
export const COMMENT_LOCKED_ERROR = 'Comentários liberam apenas depois de concluir o capítulo.'

/** Contrato de persistência/serialização do comentário, por backend. */
export interface ChapterCommentRepository<TComments> {
  /** Capítulo do livro atual que o membro concluiu (senão `null` → 403). */
  getFinishedChapter(chapterId: string, userId: string): Awaitable<ChapterCommentChapter | null>
  /** Autor para a mensagem do feed. */
  getActor(userId: string): Awaitable<ChapterCommentActor | null>
  /** Grava o comentário (upsert) + atividade. */
  commitComment(command: ChapterCommentCommand): Awaitable<void>
  /** Lista os comentários do capítulo já no formato de resposta. */
  listComments(chapterId: string, viewerId: string): Awaitable<TComments>
}

/**
 * Núcleo puro e síncrono: aplica o gate anti-spoiler e valida o texto,
 * devolvendo o comando ou o erro. Recebe o capítulo já resolvido.
 */
export function resolveChapterComment(input: {
  chapter: ChapterCommentChapter | null
  actor: ChapterCommentActor | null
  userId: string
  rawBody: unknown
}): ChapterCommentDecision {
  if (!input.chapter) {
    return { ok: false, status: 403, error: COMMENT_LOCKED_ERROR }
  }

  const body = typeof input.rawBody === 'string' ? input.rawBody.trim() : ''

  if (!body) {
    return { ok: false, status: 400, error: 'Comentário vazio.' }
  }

  if (body.length > MAX_COMMENT_LENGTH) {
    return { ok: false, status: 400, error: `Comentário deve ter até ${MAX_COMMENT_LENGTH} caracteres.` }
  }

  const actorName = input.actor?.displayName || input.actor?.login || 'Um membro'
  const message = `${actorName} comentou ${chapterMessageLabel(input.chapter)}.`

  return {
    ok: true,
    command: {
      chapterId: input.chapter.id,
      userId: input.userId,
      body,
      activity: {
        type: 'CHAPTER_COMMENTED',
        message,
        metadata: {
          chapterId: input.chapter.id,
          chapterNumber: input.chapter.number,
          chapterTitle: input.chapter.title
        }
      }
    }
  }
}

/** Resultado dos orquestradores: lista de comentários ou erro HTTP. */
export type ChapterCommentResult<TComments> =
  | { ok: true; comments: TComments }
  | { ok: false; status: number; error: string }

/**
 * Leitura (GET): passa pelo mesmo gate anti-spoiler e devolve a lista. O mock
 * não usa (faz o gate + payload síncrono direto).
 */
export async function listChapterComments<TComments>(
  repo: ChapterCommentRepository<TComments>,
  input: { chapterId: string; userId: string }
): Promise<ChapterCommentResult<TComments>> {
  const chapter = await repo.getFinishedChapter(input.chapterId, input.userId)

  if (!chapter) {
    return { ok: false, status: 403, error: COMMENT_LOCKED_ERROR }
  }

  const comments = await repo.listComments(input.chapterId, input.userId)
  return { ok: true, comments }
}

/**
 * Escrita (POST): lê pelo repositório, decide pelo núcleo, grava e devolve a
 * lista atualizada. O mock não usa (chama `resolveChapterComment` direto).
 */
export async function submitChapterComment<TComments>(
  repo: ChapterCommentRepository<TComments>,
  input: { chapterId: string; userId: string; rawBody: unknown }
): Promise<ChapterCommentResult<TComments>> {
  const [chapter, actor] = await Promise.all([
    repo.getFinishedChapter(input.chapterId, input.userId),
    repo.getActor(input.userId)
  ])

  const decision = resolveChapterComment({
    chapter,
    actor,
    userId: input.userId,
    rawBody: input.rawBody
  })

  if (!decision.ok) {
    return decision
  }

  await repo.commitComment(decision.command)
  const comments = await repo.listComments(input.chapterId, input.userId)
  return { ok: true, comments }
}

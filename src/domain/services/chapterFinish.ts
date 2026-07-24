/**
 * Serviço de domínio — conclusão de capítulo.
 *
 * Centraliza a **decisão** (gates, validação, mensagem do feed e metadados) num
 * núcleo puro (`resolveChapterFinish`) e define o **contrato de persistência**
 * (`ChapterFinishRepository`) que cada lado implementa: Prisma no backend real
 * (assíncrono) e o "banco" em memória no mock (síncrono).
 *
 * Por que o núcleo é síncrono e separado do commit: o mock é síncrono de ponta
 * a ponta (a suíte de segurança chama os handlers sem `await`); um serviço
 * totalmente assíncrono forçaria o mock a virar async e quebraria esses testes.
 * Então a regra de negócio (o valioso, antes duplicado) vive uma vez aqui, e a
 * gravação fica atrás do repositório, no idioma de cada lado.
 */
import { chapterMessageLabel } from '../chapterLabel'
import { resolveFinishedAt } from '../chapterProgress'
import { formatRating, normalizeRating } from '../rating'

/** Valor que pode vir pronto (mock) ou como promessa (Prisma). */
export type Awaitable<T> = T | Promise<T>

/** Capítulo do livro atual, na forma mínima que a decisão precisa. */
export interface ChapterFinishChapter {
  id: string
  number: number
  title: string
}

/** Autor da conclusão, para compor a mensagem do feed. */
export interface ChapterFinishActor {
  displayName: string | null
  login: string
}

/** Metadados da atividade de fim de capítulo (idênticos aos dois lados). */
export interface ChapterFinishMetadata {
  chapterId: string
  chapterNumber: number
  chapterTitle: string
  rating: number
}

/** Comando de gravação que o repositório executa (progresso + nota + feed). */
export interface ChapterFinishCommand {
  chapterId: string
  userId: string
  finishedAt: Date
  rating: number
  activity: {
    type: 'CHAPTER_FINISHED'
    message: string
    metadata: ChapterFinishMetadata
  }
}

/** Decisão do núcleo: ou um erro HTTP, ou o comando pronto para persistir. */
export type ChapterFinishDecision =
  | { ok: false; status: number; error: string }
  | { ok: true; command: ChapterFinishCommand }

/** Contrato de persistência da conclusão, implementado por cada backend. */
export interface ChapterFinishRepository<TProgress> {
  /** Capítulo do livro ATUAL (senão `null` → 404). */
  getCurrentChapter(chapterId: string): Awaitable<ChapterFinishChapter | null>
  /** Autor para a mensagem do feed. */
  getActor(userId: string): Awaitable<ChapterFinishActor | null>
  /** Grava progresso concluído + nota + atividade e devolve o progresso salvo. */
  commitFinish(command: ChapterFinishCommand): Awaitable<TProgress>
}

/**
 * Núcleo puro e síncrono: aplica as regras de conclusão e devolve o comando de
 * gravação ou o erro. Não toca em I/O — recebe o capítulo/autor já carregados.
 * `now` é injetável para testes determinísticos.
 */
export function resolveChapterFinish(input: {
  chapter: ChapterFinishChapter | null
  actor: ChapterFinishActor | null
  userId: string
  rawRating: unknown
  rawFinishedAt: unknown
  now?: Date
}): ChapterFinishDecision {
  if (!input.chapter) {
    return { ok: false, status: 404, error: 'Capítulo atual não encontrado.' }
  }

  // Nota obrigatória na conclusão (fica registrada na atividade de fim).
  const rating = normalizeRating(input.rawRating)

  if (rating === null) {
    return { ok: false, status: 400, error: 'Dê uma nota de 1 a 5 ao concluir o capítulo.' }
  }

  const finishedAt = resolveFinishedAt(input.rawFinishedAt, input.now ?? new Date())
  const actorName = input.actor?.displayName || input.actor?.login || 'Um membro'
  const message = `${actorName} terminou ${chapterMessageLabel(input.chapter)} e deu nota ${formatRating(rating)}.`

  return {
    ok: true,
    command: {
      chapterId: input.chapter.id,
      userId: input.userId,
      finishedAt,
      rating,
      activity: {
        type: 'CHAPTER_FINISHED',
        message,
        metadata: {
          chapterId: input.chapter.id,
          chapterNumber: input.chapter.number,
          chapterTitle: input.chapter.title,
          rating
        }
      }
    }
  }
}

/** Resultado do orquestrador: progresso salvo ou erro HTTP. */
export type ChapterFinishResult<TProgress> =
  | { ok: true; progress: TProgress }
  | { ok: false; status: number; error: string }

/**
 * Orquestrador assíncrono para o backend real: lê pelo repositório, decide pelo
 * núcleo e grava pelo repositório. O mock não usa este orquestrador (usa
 * `resolveChapterFinish` direto) para permanecer síncrono.
 */
export async function finishChapter<TProgress>(
  repo: ChapterFinishRepository<TProgress>,
  input: { chapterId: string; userId: string; rawRating: unknown; rawFinishedAt: unknown; now?: Date }
): Promise<ChapterFinishResult<TProgress>> {
  const [chapter, actor] = await Promise.all([
    repo.getCurrentChapter(input.chapterId),
    repo.getActor(input.userId)
  ])

  const decision = resolveChapterFinish({
    chapter,
    actor,
    userId: input.userId,
    rawRating: input.rawRating,
    rawFinishedAt: input.rawFinishedAt,
    now: input.now
  })

  if (!decision.ok) {
    return decision
  }

  const progress = await repo.commitFinish(decision.command)
  return { ok: true, progress }
}

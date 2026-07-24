/**
 * Serviço de domínio — nota de capítulo.
 *
 * Mesmo padrão de `chapterFinish.ts`: núcleo puro e síncrono
 * (`resolveChapterRating`) com o gate (anti-spoiler: só nota quem concluiu) e a
 * validação da nota, devolvendo um comando; porta `ChapterRatingRepository`
 * para a persistência (Prisma no backend, arrays no mock); e um orquestrador
 * assíncrono (`rateChapter`) para o backend real. O mock reusa o núcleo direto
 * e permanece síncrono.
 */
import { normalizeRating } from '../rating.js'

/** Valor que pode vir pronto (mock) ou como promessa (Prisma). */
export type Awaitable<T> = T | Promise<T>

/** Capítulo liberado para nota, na forma mínima que a decisão precisa. */
export interface ChapterRatingChapter {
  id: string
}

/** Comando de gravação da nota (upsert por membro/capítulo). */
export interface ChapterRatingCommand {
  chapterId: string
  userId: string
  rating: number
}

/** Decisão do núcleo: erro HTTP ou comando pronto para persistir. */
export type ChapterRatingDecision =
  | { ok: false; status: number; error: string }
  | { ok: true; command: ChapterRatingCommand }

/** Contrato de persistência da nota, implementado por cada backend. */
export interface ChapterRatingRepository<TRating> {
  /** Capítulo do livro atual que o membro concluiu (senão `null` → 403). */
  getFinishedChapter(chapterId: string, userId: string): Awaitable<ChapterRatingChapter | null>
  /** Grava a nota (upsert) e devolve o registro salvo. */
  saveRating(command: ChapterRatingCommand): Awaitable<TRating>
}

/**
 * Núcleo puro e síncrono: aplica o gate anti-spoiler e valida a nota, devolvendo
 * o comando ou o erro. Recebe o capítulo já resolvido (ou `null` quando o membro
 * não concluiu / não é o livro atual).
 */
export function resolveChapterRating(input: {
  chapter: ChapterRatingChapter | null
  userId: string
  rawRating: unknown
}): ChapterRatingDecision {
  if (!input.chapter) {
    return { ok: false, status: 403, error: 'Conclua o capítulo antes de dar a sua nota.' }
  }

  const rating = normalizeRating(input.rawRating)

  if (rating === null) {
    return { ok: false, status: 400, error: 'A nota deve ser um número entre 1 e 5.' }
  }

  return { ok: true, command: { chapterId: input.chapter.id, userId: input.userId, rating } }
}

/** Resultado do orquestrador: nota salva ou erro HTTP. */
export type ChapterRatingResult<TRating> =
  | { ok: true; rating: TRating }
  | { ok: false; status: number; error: string }

/**
 * Orquestrador assíncrono para o backend real: lê pelo repositório, decide pelo
 * núcleo e grava pelo repositório. O mock não usa este orquestrador (chama
 * `resolveChapterRating` direto) para permanecer síncrono.
 */
export async function rateChapter<TRating>(
  repo: ChapterRatingRepository<TRating>,
  input: { chapterId: string; userId: string; rawRating: unknown }
): Promise<ChapterRatingResult<TRating>> {
  const chapter = await repo.getFinishedChapter(input.chapterId, input.userId)

  const decision = resolveChapterRating({
    chapter,
    userId: input.userId,
    rawRating: input.rawRating
  })

  if (!decision.ok) {
    return decision
  }

  const rating = await repo.saveRating(decision.command)
  return { ok: true, rating }
}

/**
 * Serviço de domínio — avaliação (review) do livro.
 *
 * Mesmo padrão de `chapterFinish.ts`/`chapterRating.ts`: núcleo puro e síncrono
 * (`resolveBookReview`) com os gates (livro atual, todos os capítulos concluídos
 * e notados), a validação da nota e o limite da resenha, devolvendo um comando;
 * porta `BookReviewRepository` para a persistência; e um orquestrador
 * assíncrono (`submitBookReview`) para o backend real. O mock reusa o núcleo
 * direto e permanece síncrono.
 */
import { formatRating, normalizeRating } from '../rating.js'

/** Valor que pode vir pronto (mock) ou como promessa (Prisma). */
export type Awaitable<T> = T | Promise<T>

/** Tamanho máximo da resenha (em caracteres). */
export const MAX_REVIEW_LENGTH = 1000

/** Livro atual do clube, na forma mínima que a decisão precisa. */
export interface BookReviewBook {
  clubBookId: string
  bookId: string
  title: string
}

/** Autor da avaliação, para compor a mensagem do feed. */
export interface BookReviewActor {
  displayName: string | null
  login: string
}

/** Comando de gravação da avaliação (upsert + atividade no feed). */
export interface BookReviewCommand {
  clubBookId: string
  userId: string
  rating: number
  review: string | null
  activity: {
    type: 'BOOK_REVIEWED'
    message: string
    metadata: { bookId: string; rating: number }
  }
}

/** Decisão do núcleo: erro HTTP ou comando pronto para persistir. */
export type BookReviewDecision =
  | { ok: false; status: number; error: string }
  | { ok: true; command: BookReviewCommand }

/** Contrato de persistência da avaliação, implementado por cada backend. */
export interface BookReviewRepository<TReview> {
  /** Livro atual do clube (senão `null` → 404). */
  getCurrentBook(): Awaitable<BookReviewBook | null>
  /** Autor para a mensagem do feed. */
  getActor(userId: string): Awaitable<BookReviewActor | null>
  /** O membro concluiu todos os capítulos do livro? */
  userFinishedAllChapters(clubBookId: string, userId: string): Awaitable<boolean>
  /** O membro deu nota a todos os capítulos do livro? */
  userRatedAllChapters(clubBookId: string, userId: string): Awaitable<boolean>
  /** Grava a avaliação (upsert) + atividade e devolve o registro salvo. */
  commitReview(command: BookReviewCommand): Awaitable<TReview>
}

/**
 * Núcleo puro e síncrono: aplica os gates na ordem do backend real (livro atual
 * → nota → tamanho da resenha → capítulos concluídos → capítulos notados) e
 * devolve o comando ou o erro. Recebe os dados/flags já carregados.
 */
export function resolveBookReview(input: {
  currentBook: BookReviewBook | null
  actor: BookReviewActor | null
  userId: string
  rawRating: unknown
  rawReview: unknown
  finishedAllChapters: boolean
  ratedAllChapters: boolean
}): BookReviewDecision {
  if (!input.currentBook) {
    return { ok: false, status: 404, error: 'Não existe livro atual em andamento.' }
  }

  const rating = normalizeRating(input.rawRating)

  if (rating === null) {
    return { ok: false, status: 400, error: 'A nota deve ser um número entre 1 e 5.' }
  }

  const review =
    typeof input.rawReview === 'string' && input.rawReview.trim() ? input.rawReview.trim() : null

  if (review && review.length > MAX_REVIEW_LENGTH) {
    return { ok: false, status: 400, error: `A resenha deve ter até ${MAX_REVIEW_LENGTH} caracteres.` }
  }

  if (!input.finishedAllChapters) {
    return { ok: false, status: 403, error: 'Conclua todos os capítulos para avaliar o livro.' }
  }

  if (!input.ratedAllChapters) {
    return { ok: false, status: 403, error: 'Dê sua nota a todos os capítulos antes de avaliar o livro.' }
  }

  const actorName = input.actor?.displayName || input.actor?.login || 'Um membro'
  const message = `${actorName} avaliou ${input.currentBook.title} com ${formatRating(rating)}/5.`

  return {
    ok: true,
    command: {
      clubBookId: input.currentBook.clubBookId,
      userId: input.userId,
      rating,
      review,
      activity: {
        type: 'BOOK_REVIEWED',
        message,
        metadata: { bookId: input.currentBook.bookId, rating }
      }
    }
  }
}

/** Resultado do orquestrador: avaliação salva ou erro HTTP. */
export type BookReviewResult<TReview> =
  | { ok: true; review: TReview }
  | { ok: false; status: number; error: string }

/**
 * Orquestrador assíncrono para o backend real: lê pelo repositório (livro,
 * autor e os dois gates de capítulos), decide pelo núcleo e grava. O mock não
 * usa este orquestrador (chama `resolveBookReview` direto) para permanecer
 * síncrono.
 */
export async function submitBookReview<TReview>(
  repo: BookReviewRepository<TReview>,
  input: { userId: string; rawRating: unknown; rawReview: unknown }
): Promise<BookReviewResult<TReview>> {
  const [currentBook, actor] = await Promise.all([repo.getCurrentBook(), repo.getActor(input.userId)])

  const [finishedAllChapters, ratedAllChapters] = currentBook
    ? await Promise.all([
        repo.userFinishedAllChapters(currentBook.clubBookId, input.userId),
        repo.userRatedAllChapters(currentBook.clubBookId, input.userId)
      ])
    : [false, false]

  const decision = resolveBookReview({
    currentBook,
    actor,
    userId: input.userId,
    rawRating: input.rawRating,
    rawReview: input.rawReview,
    finishedAllChapters,
    ratedAllChapters
  })

  if (!decision.ok) {
    return decision
  }

  const review = await repo.commitReview(decision.command)
  return { ok: true, review }
}

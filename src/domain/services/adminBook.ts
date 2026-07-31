/**
 * Serviço de domínio — ciclo do livro atual pelo admin (selecionar e finalizar).
 *
 * Núcleos puros com validação e gates, devolvendo comando + atividade do feed;
 * portas para a persistência; orquestradores para o backend real. O mock reusa
 * os núcleos e permanece síncrono.
 */

import { generatedChapters, resolveChapterCount, type GeneratedChapter } from '../chapterStructure'

/** Valor que pode vir pronto (mock) ou como promessa (Prisma). */
export type Awaitable<T> = T | Promise<T>

// --- Selecionar livro atual ------------------------------------------------

/** Mesma mensagem nos dois lados (e na re-checagem dentro da transação). */
export const CURRENT_BOOK_CONFLICT = 'Já existe um livro atual em andamento.'

export interface SelectBookCommand {
  title: string
  author: string | null
  description: string | null
  coverUrl: string | null
  /**
   * Estrutura pronta do livro. A quantidade informada pelo admin não é
   * persistida em nenhum campo: ela só decide quantas linhas nascem aqui, e a
   * contagem de `Chapter` passa a ser a verdade.
   */
  chapters: GeneratedChapter[]
  activity: { type: 'BOOK_SELECTED'; message: string }
}

export type SelectBookDecision =
  | { ok: false; status: number; error: string }
  | { ok: true; command: SelectBookCommand }

function trimOrNull(raw: unknown): string | null {
  return typeof raw === 'string' && raw.trim() ? raw.trim() : null
}

export function resolveSelectBook(input: {
  hasCurrentBook: boolean
  rawTitle: unknown
  rawAuthor: unknown
  rawDescription: unknown
  rawCoverUrl?: unknown
  rawChapterCount?: unknown
}): SelectBookDecision {
  const title = typeof input.rawTitle === 'string' ? input.rawTitle.trim() : ''

  if (!title) {
    return { ok: false, status: 400, error: 'Título do livro é obrigatório.' }
  }

  // Input inválido antes de conflito de estado, como já era com o título.
  const chapterCount = resolveChapterCount(input.rawChapterCount)

  if (!chapterCount.ok) {
    return chapterCount
  }

  if (input.hasCurrentBook) {
    return { ok: false, status: 409, error: CURRENT_BOOK_CONFLICT }
  }

  return {
    ok: true,
    command: {
      title,
      author: trimOrNull(input.rawAuthor),
      description: trimOrNull(input.rawDescription),
      coverUrl: trimOrNull(input.rawCoverUrl),
      chapters: generatedChapters(chapterCount.count),
      activity: { type: 'BOOK_SELECTED', message: `${title} virou o livro atual do clube.` }
    }
  }
}

export interface SelectBookRepository<TSelected> {
  hasCurrentBook(): Awaitable<boolean>
  selectBook(command: SelectBookCommand): Awaitable<TSelected>
}

export type SelectBookResult<TSelected> =
  | { ok: true; currentBook: TSelected }
  | { ok: false; status: number; error: string }

export async function selectBook<TSelected>(
  repo: SelectBookRepository<TSelected>,
  input: {
    rawTitle: unknown
    rawAuthor: unknown
    rawDescription: unknown
    rawCoverUrl?: unknown
    rawChapterCount?: unknown
  }
): Promise<SelectBookResult<TSelected>> {
  const hasCurrentBook = await repo.hasCurrentBook()

  const decision = resolveSelectBook({
    hasCurrentBook,
    rawTitle: input.rawTitle,
    rawAuthor: input.rawAuthor,
    rawDescription: input.rawDescription,
    rawCoverUrl: input.rawCoverUrl,
    rawChapterCount: input.rawChapterCount
  })

  if (!decision.ok) {
    return decision
  }

  const currentBook = await repo.selectBook(decision.command)
  return { ok: true, currentBook }
}

// --- Finalizar livro atual -------------------------------------------------

/** Livro atual, na forma mínima que a decisão precisa. */
export interface FinishBookCurrent {
  clubBookId: string
  bookId: string
  title: string
}

export interface FinishBookCommand {
  clubBookId: string
  activity: { type: 'BOOK_FINISHED'; message: string; metadata: { bookId: string } }
}

export type FinishBookDecision =
  | { ok: false; status: number; error: string }
  | { ok: true; command: FinishBookCommand }

export function resolveFinishBook(input: {
  currentBook: FinishBookCurrent | null
}): FinishBookDecision {
  if (!input.currentBook) {
    return { ok: false, status: 404, error: 'Não existe livro atual em andamento.' }
  }

  return {
    ok: true,
    command: {
      clubBookId: input.currentBook.clubBookId,
      activity: {
        type: 'BOOK_FINISHED',
        message: `${input.currentBook.title} foi finalizado pelo clube.`,
        metadata: { bookId: input.currentBook.bookId }
      }
    }
  }
}

export interface FinishBookRepository<TFinished> {
  getCurrentBook(): Awaitable<FinishBookCurrent | null>
  finishBook(command: FinishBookCommand): Awaitable<TFinished>
}

export type FinishBookResult<TFinished> =
  | { ok: true; finishedBook: TFinished }
  | { ok: false; status: number; error: string }

export async function finishBook<TFinished>(
  repo: FinishBookRepository<TFinished>
): Promise<FinishBookResult<TFinished>> {
  const currentBook = await repo.getCurrentBook()

  const decision = resolveFinishBook({ currentBook })

  if (!decision.ok) {
    return decision
  }

  const finishedBook = await repo.finishBook(decision.command)
  return { ok: true, finishedBook }
}

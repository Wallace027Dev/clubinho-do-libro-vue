/**
 * Serviço de domínio — administração de capítulos (criar, editar, excluir).
 *
 * Mesmo padrão dos demais serviços: núcleo puro com as validações e os gates,
 * devolvendo um comando; porta `AdminChaptersRepository` para a persistência; e
 * orquestradores assíncronos para o backend real. O mock reusa os núcleos e
 * permanece síncrono.
 *
 * Consistência: o núcleo decide o 409 de número duplicado a partir dos números
 * já existentes, então o backend real passa a responder 409 (como o mock),
 * em vez do 500 por violação de unique que acontecia antes.
 */

/** Valor que pode vir pronto (mock) ou como promessa (Prisma). */
export type Awaitable<T> = T | Promise<T>

/** Capítulo na forma mínima que as decisões precisam. */
export interface AdminChapter {
  id: string
  clubBookId: string
  number: number
  title: string
}

const NO_CURRENT_BOOK = 'Não existe livro atual em andamento.'
const CHAPTER_NOT_FOUND = 'Capítulo atual não encontrado.'
const DUPLICATE_NUMBER = 'Já existe um capítulo com esse número neste livro.'

function parseChapterNumber(raw: unknown): number {
  return Number(raw)
}

function isValidChapterNumber(value: number): boolean {
  return Number.isInteger(value) && value >= 0
}

// --- Criar -----------------------------------------------------------------

export interface CreateChapterCommand {
  clubBookId: string
  number: number
  title: string
}

export type CreateChapterDecision =
  | { ok: false; status: number; error: string }
  | { ok: true; command: CreateChapterCommand }

export function resolveCreateChapter(input: {
  currentBookId: string | null
  existingNumbers: readonly number[]
  rawNumber: unknown
  rawTitle: unknown
}): CreateChapterDecision {
  if (!input.currentBookId) {
    return { ok: false, status: 404, error: NO_CURRENT_BOOK }
  }

  const number = parseChapterNumber(input.rawNumber)
  const title = typeof input.rawTitle === 'string' ? input.rawTitle.trim() : ''

  if (!isValidChapterNumber(number) || !title) {
    return { ok: false, status: 400, error: 'Informe número (0 para prólogo) e título do capítulo.' }
  }

  if (input.existingNumbers.includes(number)) {
    return { ok: false, status: 409, error: DUPLICATE_NUMBER }
  }

  return { ok: true, command: { clubBookId: input.currentBookId, number, title } }
}

// --- Editar ----------------------------------------------------------------

export interface UpdateChapterCommand {
  chapterId: string
  changes: { number?: number; title?: string }
}

export type UpdateChapterDecision =
  | { ok: false; status: number; error: string }
  | { ok: true; command: UpdateChapterCommand }

export function resolveUpdateChapter(input: {
  chapter: AdminChapter | null
  siblingNumbers: readonly number[]
  rawNumber: unknown
  rawTitle: unknown
}): UpdateChapterDecision {
  if (!input.chapter) {
    return { ok: false, status: 404, error: CHAPTER_NOT_FOUND }
  }

  const changes: { number?: number; title?: string } = {}

  if (input.rawNumber !== undefined) {
    const number = parseChapterNumber(input.rawNumber)

    if (!isValidChapterNumber(number)) {
      return { ok: false, status: 400, error: 'Número de capítulo inválido.' }
    }

    if (input.siblingNumbers.includes(number)) {
      return { ok: false, status: 409, error: DUPLICATE_NUMBER }
    }

    changes.number = number
  }

  if (input.rawTitle !== undefined) {
    const title = typeof input.rawTitle === 'string' ? input.rawTitle.trim() : ''

    if (!title) {
      return { ok: false, status: 400, error: 'Título do capítulo não pode ficar vazio.' }
    }

    changes.title = title
  }

  if (!('number' in changes) && !('title' in changes)) {
    return { ok: false, status: 400, error: 'Nada para atualizar.' }
  }

  return { ok: true, command: { chapterId: input.chapter.id, changes } }
}

// --- Excluir ---------------------------------------------------------------

export type DeleteChapterDecision =
  | { ok: false; status: number; error: string }
  | { ok: true; chapterId: string }

export function resolveDeleteChapter(input: {
  chapter: AdminChapter | null
  hasMemberActivity: boolean
}): DeleteChapterDecision {
  if (!input.chapter) {
    return { ok: false, status: 404, error: CHAPTER_NOT_FOUND }
  }

  if (input.hasMemberActivity) {
    return {
      ok: false,
      status: 409,
      error: 'Este capítulo já tem progresso ou comentários de membros e não pode ser excluído.'
    }
  }

  return { ok: true, chapterId: input.chapter.id }
}

// --- Porta + orquestradores (backend real) ---------------------------------

export interface AdminChaptersRepository<TChapter> {
  getCurrentBookId(): Awaitable<string | null>
  getExistingNumbers(clubBookId: string): Awaitable<number[]>
  createChapter(command: CreateChapterCommand): Awaitable<TChapter>
  getCurrentChapter(chapterId: string): Awaitable<AdminChapter | null>
  getSiblingNumbers(chapter: AdminChapter): Awaitable<number[]>
  updateChapter(command: UpdateChapterCommand): Awaitable<TChapter>
  hasMemberActivity(chapterId: string): Awaitable<boolean>
  deleteChapter(chapterId: string): Awaitable<void>
}

export type CreateChapterResult<TChapter> =
  | { ok: true; chapter: TChapter }
  | { ok: false; status: number; error: string }

export async function createChapter<TChapter>(
  repo: AdminChaptersRepository<TChapter>,
  input: { rawNumber: unknown; rawTitle: unknown }
): Promise<CreateChapterResult<TChapter>> {
  const currentBookId = await repo.getCurrentBookId()
  const existingNumbers = currentBookId ? await repo.getExistingNumbers(currentBookId) : []

  const decision = resolveCreateChapter({
    currentBookId,
    existingNumbers,
    rawNumber: input.rawNumber,
    rawTitle: input.rawTitle
  })

  if (!decision.ok) {
    return decision
  }

  const chapter = await repo.createChapter(decision.command)
  return { ok: true, chapter }
}

export async function updateChapter<TChapter>(
  repo: AdminChaptersRepository<TChapter>,
  input: { chapterId: string; rawNumber: unknown; rawTitle: unknown }
): Promise<CreateChapterResult<TChapter>> {
  const chapter = await repo.getCurrentChapter(input.chapterId)
  const siblingNumbers = chapter ? await repo.getSiblingNumbers(chapter) : []

  const decision = resolveUpdateChapter({
    chapter,
    siblingNumbers,
    rawNumber: input.rawNumber,
    rawTitle: input.rawTitle
  })

  if (!decision.ok) {
    return decision
  }

  const updated = await repo.updateChapter(decision.command)
  return { ok: true, chapter: updated }
}

export type DeleteChapterResult =
  | { ok: true }
  | { ok: false; status: number; error: string }

export async function deleteChapter<TChapter>(
  repo: AdminChaptersRepository<TChapter>,
  input: { chapterId: string }
): Promise<DeleteChapterResult> {
  const chapter = await repo.getCurrentChapter(input.chapterId)
  const hasMemberActivity = chapter ? await repo.hasMemberActivity(chapter.id) : false

  const decision = resolveDeleteChapter({ chapter, hasMemberActivity })

  if (!decision.ok) {
    return decision
  }

  await repo.deleteChapter(decision.chapterId)
  return { ok: true }
}

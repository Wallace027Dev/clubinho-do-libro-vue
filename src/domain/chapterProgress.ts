/**
 * Camada de domínio — progresso de leitura e liberação de conteúdo.
 *
 * Fonte única das regras de acesso a capítulo (anti-spoiler), conclusão e
 * horário de conclusão. Consumida pelo backend real (`api/`) e pelo mock
 * (`src/services/mockApi/`). Funções puras, sem I/O.
 */

/** Status de leitura de um capítulo por um membro. */
export type ProgressStatus = 'NOT_STARTED' | 'STARTED' | 'FINISHED'

/** Status de um livro na trilha do clube. */
export type ClubBookStatus = 'CURRENT' | 'FINISHED' | 'UPCOMING'

/**
 * Regra anti-spoiler: o comentário/nota de um capítulo só é liberado para quem
 * **concluiu** aquele capítulo, e apenas enquanto o livro é o **atual** do
 * clube. Fonte única da decisão — o backend e o mock apenas trazem os status.
 */
export function isChapterUnlocked(input: {
  clubBookStatus: ClubBookStatus | string | null | undefined
  progressStatus: ProgressStatus | string | null | undefined
}): boolean {
  return input.clubBookStatus === 'CURRENT' && input.progressStatus === 'FINISHED'
}

/** O membro concluiu todos os capítulos? Livro sem capítulos não conta. */
export function everyChapterFinished(statuses: readonly (string | null | undefined)[]): boolean {
  return statuses.length > 0 && statuses.every((status) => status === 'FINISHED')
}

/**
 * O membro deu nota a todos os capítulos? Recebe, por capítulo, se há nota do
 * membro. Livro sem capítulos não conta.
 */
export function everyChapterRated(hasRating: readonly boolean[]): boolean {
  return hasRating.length > 0 && hasRating.every(Boolean)
}

/**
 * Resolve o horário de conclusão informado pelo membro. Aceita apenas datas
 * válidas e **não futuras**; caso contrário, usa `now` como padrão. `now` é
 * injetado para manter a função pura e testável.
 */
export function resolveFinishedAt(raw: unknown, now: Date = new Date()): Date {
  if (typeof raw !== 'string' || !raw) {
    return now
  }

  const parsed = new Date(raw)

  if (Number.isNaN(parsed.getTime()) || parsed.getTime() > now.getTime()) {
    return now
  }

  return parsed
}

/**
 * Estrutura de capítulos criada junto com o livro atual.
 *
 * Quando o admin aceita o vencedor do sorteio, informa quantos capítulos o
 * livro tem e o clube já nasce com a estrutura pronta — em vez de cadastrar
 * capítulo por capítulo no painel.
 *
 * Capítulo gerado nasce **sem título**: o número já identifica ("Capítulo 3"),
 * e o título real é preenchido depois pelo painel admin. Não confundir com o
 * cadastro manual (`services/adminChapters.ts`), que continua exigindo título —
 * lá um humano está descrevendo um capítulo específico.
 *
 * Fonte única: o backend real (`createMany`) e o mock consomem as mesmas linhas,
 * então os registros saem idênticos dos dois lados.
 */

/** Teto anti-erro de digitação: desfazer excesso custa um DELETE por capítulo. */
export const MAX_GENERATED_CHAPTERS = 200

export interface GeneratedChapter {
  number: number
  title: string
}

export type ChapterCountDecision =
  | { ok: false; status: 400; error: string }
  | { ok: true; count: number }

const INVALID_COUNT_ERROR = `Informe a quantidade de capítulos (de 0 a ${MAX_GENERATED_CHAPTERS}).`

/**
 * Ausente é válido e vale 0 — é assim que o cadastro manual do painel (que não
 * manda o campo) continua criando o livro sem capítulo nenhum.
 */
export function resolveChapterCount(raw: unknown): ChapterCountDecision {
  if (raw === undefined || raw === null) {
    return { ok: true, count: 0 }
  }

  if (typeof raw !== 'number' || !Number.isInteger(raw)) {
    return { ok: false, status: 400, error: INVALID_COUNT_ERROR }
  }

  if (raw < 0 || raw > MAX_GENERATED_CHAPTERS) {
    return { ok: false, status: 400, error: INVALID_COUNT_ERROR }
  }

  return { ok: true, count: raw }
}

/** Capítulos 1..count, sem título. Numeração começa em 1 (0 é prólogo, manual). */
export function generatedChapters(count: number): GeneratedChapter[] {
  if (count <= 0) {
    return []
  }

  return Array.from({ length: count }, (_, index) => ({ number: index + 1, title: '' }))
}

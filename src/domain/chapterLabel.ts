/**
 * Camada de domínio — rótulos de capítulo.
 *
 * Fonte única da regra de "capítulo avulso" (Prólogo/Epílogo não levam
 * numeração) e dos rótulos derivados. Consumida pelo backend real (`api/`),
 * pelo mock e pelo frontend (`src/utils/chapters.ts`). Funções puras.
 */

type ChapterLike = { number: number; title: string }

/**
 * Capítulos "avulsos" (Prólogo/Epílogo) não levam numeração: o número existe
 * só para ordenar (0 = prólogo, último = epílogo) e o nome é exibido no lugar
 * de "Capítulo N". Reconhece com e sem acento, ignorando caixa e espaços.
 */
export function isStandaloneChapterTitle(title: string): boolean {
  const normalized = title.trim().toLowerCase()
  return ['prólogo', 'prologo', 'epílogo', 'epilogo'].includes(normalized)
}

/** Rótulo para mensagens do feed: "o prólogo", "o epílogo", "o capítulo 3". */
export function chapterMessageLabel(chapter: ChapterLike): string {
  return isStandaloneChapterTitle(chapter.title)
    ? `o ${chapter.title.trim().toLowerCase()}`
    : `o capítulo ${chapter.number}`
}

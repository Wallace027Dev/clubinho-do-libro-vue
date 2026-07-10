/**
 * Capítulos "avulsos" (Prólogo/Epílogo) não levam numeração nos textos:
 * são cadastrados com número só para ordenação (0 = prólogo, último =
 * epílogo) e exibidos pelo nome.
 */
export function isStandaloneChapterTitle(title: string) {
  const normalized = title.trim().toLowerCase()
  return ['prólogo', 'prologo', 'epílogo', 'epilogo'].includes(normalized)
}

/** Rótulo para mensagens do feed: "o prólogo", "o epílogo", "o capítulo 3". */
export function chapterMessageLabel(chapter: { number: number; title: string }) {
  return isStandaloneChapterTitle(chapter.title)
    ? `o ${chapter.title.trim().toLowerCase()}`
    : `o capítulo ${chapter.number}`
}

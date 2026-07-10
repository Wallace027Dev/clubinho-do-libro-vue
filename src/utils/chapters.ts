/**
 * Capítulos "avulsos" (Prólogo/Epílogo) não levam numeração na
 * interface: o número existe só para ordenar (0 = prólogo, último =
 * epílogo) e o nome é exibido no lugar de "Capítulo N".
 */
export function isStandaloneChapterTitle(title: string) {
  const normalized = title.trim().toLowerCase()
  return ['prólogo', 'prologo', 'epílogo', 'epilogo'].includes(normalized)
}

/** Etiqueta do capítulo: "Prólogo", "Epílogo" ou "Capítulo 3". */
export function chapterTag(chapter: { number: number; title: string }) {
  return isStandaloneChapterTitle(chapter.title) ? chapter.title.trim() : `Capítulo ${chapter.number}`
}

/** Versão para meio de frase: "o prólogo", "o capítulo 3". */
export function chapterTagLower(chapter: { number: number; title: string }) {
  return isStandaloneChapterTitle(chapter.title)
    ? `o ${chapter.title.trim().toLowerCase()}`
    : `o capítulo ${chapter.number}`
}

/** Rótulo curto para o heatmap: "P", "E" ou "C3". */
export function chapterShortTag(chapter: { number: number; title: string }) {
  return isStandaloneChapterTitle(chapter.title)
    ? chapter.title.trim()[0].toUpperCase()
    : `C${chapter.number}`
}

/** Etiqueta a partir do metadata de atividade (numero e, se houver, título). */
export function chapterTagFromMeta(number?: number | null, title?: string | null) {
  if (title && isStandaloneChapterTitle(title)) {
    return title.trim()
  }

  if (number === 0) {
    return 'Prólogo'
  }

  return number != null ? `Capítulo ${number}` : 'Capítulo'
}

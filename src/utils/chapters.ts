// A regra de "capítulo avulso" (Prólogo/Epílogo sem numeração) vive na camada
// de domínio, fonte única compartilhada com o backend e o mock. Reexportamos
// aqui para as views/utilitários do frontend continuarem importando de um só
// lugar.
export { isStandaloneChapterTitle } from '../domain/chapterLabel'
import { isStandaloneChapterTitle } from '../domain/chapterLabel'

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

/**
 * Título de cabeçalho/linha de lista, sem repetição e sem sobra:
 * "Prólogo", "Capítulo 3" (capítulo ainda sem título — caso dos gerados junto
 * com o livro) ou "Capítulo 3 — Rumo a Tarbean".
 */
export function chapterHeading(chapter: { number: number; title: string }) {
  const tag = chapterTag(chapter)
  const title = chapter.title.trim()

  if (!title || isStandaloneChapterTitle(title)) {
    return tag
  }

  return `${tag} — ${title}`
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

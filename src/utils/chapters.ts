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

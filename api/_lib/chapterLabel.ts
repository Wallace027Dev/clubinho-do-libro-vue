/**
 * Rótulos de capítulo para o backend. A regra vive na camada de domínio
 * (`src/domain/chapterLabel.ts`), fonte única compartilhada com o mock e o
 * frontend; aqui só reexportamos para manter os imports do `api/` locais.
 */
export { chapterMessageLabel, isStandaloneChapterTitle } from '../../src/domain/chapterLabel.js'

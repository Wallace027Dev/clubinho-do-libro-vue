/**
 * Catálogo fixo da busca de livro na HOMOLOGAÇÃO.
 *
 * O mock é síncrono (`runMock` devolve a resposta na hora), então não há como
 * chamar provedor de verdade — mesmo padrão do `pushSim.ts`: em vez de fazer, o
 * mock simula, num módulo separado, na mesma forma normalizada que a API real
 * devolve.
 *
 * As fixtures existem para exercitar as lacunas **reais** medidas nos
 * provedores: livro brasileiro sem capa e sem número de páginas, contagem
 * aproximada (mediana entre edições no Open Library), autor múltiplo e título
 * longo. As URLs de capa apontam para o Open Library (públicas e verificadas);
 * em homologação carregam de verdade, e em teste (jsdom) nem são buscadas.
 */
import { MAX_SEARCH_RESULTS, type ExternalBook, type ExternalBookSource } from '../../domain/bookSearch'

/** A sinopse só existe no detalhe — na listagem a API real não manda. */
const CATALOG: ExternalBook[] = [
  {
    source: 'google',
    providerId: 'g-duna',
    title: 'Duna',
    authors: ['Frank Herbert'],
    publisher: 'Aleph',
    pageCount: 792,
    pageCountApproximate: false,
    isbn: '9788576573265',
    coverUrl: 'https://covers.openlibrary.org/b/id/11481354-M.jpg',
    description: 'Em Arrakis, o planeta deserto, a especiaria é a moeda do universo.'
  },
  {
    source: 'google',
    providerId: 'g-sapiens',
    title: 'Sapiens: Uma Breve História da Humanidade',
    // Três autores: exercita a linha de metadados com junção.
    authors: ['Yuval Noah Harari', 'Janaína Marcoantonio', 'Jamie Bulloch'],
    publisher: 'L&PM',
    pageCount: 464,
    pageCountApproximate: false,
    isbn: '9788525432186',
    coverUrl: 'https://covers.openlibrary.org/b/id/8541303-M.jpg',
    description: 'Do surgimento do Homo sapiens às revoluções cognitiva e agrícola.'
  },
  {
    source: 'openlibrary',
    providerId: '/works/OL1003040W',
    title: 'Dom Casmurro',
    authors: ['Machado de Assis'],
    publisher: 'Penguin-Companhia',
    pageCount: 400,
    pageCountApproximate: false,
    isbn: '9788582850350',
    coverUrl: 'https://covers.openlibrary.org/b/id/647501-M.jpg',
    description: 'Bentinho, Capitu e uma dúvida que atravessa a literatura brasileira.'
  },
  {
    source: 'openlibrary',
    providerId: '/works/OL2670142W',
    title: 'Dom Casmurro: edição comentada',
    // Mesmo autor e prefixo do item acima: exercita lista com vários resultados
    // sem cair na deduplicação (título diferente).
    authors: ['Machado de Assis'],
    publisher: null,
    pageCount: 268,
    pageCountApproximate: true,
    isbn: null,
    coverUrl: 'https://covers.openlibrary.org/b/id/123224-M.jpg',
    description: 'Edição com notas e ensaios sobre o romance.'
  },
  {
    source: 'openlibrary',
    providerId: '/works/OL5735363W',
    title: 'Memórias Póstumas de Brás Cubas',
    authors: ['Machado de Assis'],
    publisher: 'Nova Fronteira',
    pageCount: 242,
    pageCountApproximate: false,
    isbn: '9788520923061',
    coverUrl: 'https://covers.openlibrary.org/b/id/123152-M.jpg',
    description: 'O defunto autor conta a própria vida sem pressa de agradar.'
  },
  {
    source: 'openlibrary',
    providerId: '/works/OL15706062W',
    title: 'Bom Dia, Camaradas',
    // O caso brasileiro medido: nem capa, nem número de páginas, nem editora.
    authors: ['Ondjaki'],
    publisher: null,
    pageCount: null,
    pageCountApproximate: false,
    isbn: null,
    coverUrl: null,
    description: 'Luanda dos anos 1990 pelos olhos de um menino.'
  },
  {
    source: 'openlibrary',
    providerId: '/works/OL27448W',
    title: 'O Cortiço',
    authors: ['Aluísio Azevedo'],
    publisher: null,
    // Mediana entre edições: a UI mostra como aproximado.
    pageCount: 304,
    pageCountApproximate: true,
    isbn: null,
    coverUrl: 'https://covers.openlibrary.org/b/id/6642965-M.jpg',
    description: 'A vida do cortiço de São Romão como organismo coletivo.'
  },
  {
    source: 'openlibrary',
    providerId: '/works/OL99999W',
    // Título longo: exercita truncamento/quebra na linha da listagem.
    title:
      'A Incrível e Triste História da Cândida Erêndira e da Sua Avó Desalmada e Outros Contos',
    authors: ['Gabriel García Márquez'],
    publisher: 'Record',
    pageCount: 176,
    pageCountApproximate: false,
    isbn: '9788501012098',
    coverUrl: null,
    description: 'Contos do realismo fantástico latino-americano.'
  }
]

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}

/** Casamento por pedaço do título ou do nome de autor (LIKE, não igualdade). */
export function searchFixtureBooks(term: string, limit = MAX_SEARCH_RESULTS): ExternalBook[] {
  const needle = normalize(term)

  return CATALOG.filter((book) => {
    const alvo = [book.title, ...book.authors].map(normalize)
    return alvo.some((value) => value.includes(needle))
  })
    .slice(0, limit)
    // Ordem estável (índice do catálogo) e sem sinopse, como na API real.
    .map((book) => ({ ...book, description: null }))
}

/** O detalhe é o único que traz a sinopse — como no provedor real. */
export function findFixtureBook(source: ExternalBookSource, id: string): ExternalBook | null {
  return CATALOG.find((book) => book.source === source && book.providerId === id) ?? null
}

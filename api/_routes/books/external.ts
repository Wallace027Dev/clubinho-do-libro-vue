import { requireAdmin } from '../../_lib/auth.js'
import { getExternalBook } from '../../_lib/bookSearch/index.js'
import { assertMethod, sendJson } from '../../_lib/http.js'
import type { ExternalBookSource } from '../../../src/domain/bookSearch.js'

/**
 * Dados completos de um livro escolhido na busca.
 *
 * Id vai por **query param**, não no path: a chave do Open Library é
 * `/works/OL123W` — contém barra, e o roteador (`api/_lib/router.ts`) casa rota
 * por segmento separado por `/`.
 */
const SOURCES: ExternalBookSource[] = ['google', 'openlibrary']

function readSource(raw: unknown): ExternalBookSource | null {
  return typeof raw === 'string' && SOURCES.includes(raw as ExternalBookSource)
    ? (raw as ExternalBookSource)
    : null
}

export default async function handler(req: any, res: any) {
  if (!assertMethod(req, res, ['GET'])) {
    return
  }

  const session = await requireAdmin(req, res)

  if (!session) {
    return
  }

  const source = readSource(req.query.source)
  const id = typeof req.query.id === 'string' ? req.query.id.trim() : ''

  if (!source || !id) {
    sendJson(res, 400, { error: 'Informe a fonte e o id do livro.' })
    return
  }

  try {
    const book = await getExternalBook(source, id)

    if (!book) {
      sendJson(res, 404, { error: 'Livro não encontrado no catálogo.' })
      return
    }

    sendJson(res, 200, { book })
  } catch (error) {
    console.warn('[bookSearch] detalhe do livro falhou:', (error as Error).message)
    sendJson(res, 503, { error: 'Não foi possível carregar o livro. Tente de novo.' })
  }
}

import { requireAdmin } from '../../_lib/auth.js'
import { searchBooks } from '../../_lib/bookSearch/index.js'
import { assertMethod, sendJson } from '../../_lib/http.js'
import { resolveBookSearchQuery } from '../../../src/domain/bookSearch.js'

/**
 * Busca de livro por título/autor para o sorteio. Só admin: é recurso externo
 * com cota, e quem escolhe o candidato é o admin.
 */
export default async function handler(req: any, res: any) {
  if (!assertMethod(req, res, ['GET'])) {
    return
  }

  const session = await requireAdmin(req, res)

  if (!session) {
    return
  }

  const decision = resolveBookSearchQuery(req.query.q)

  if (!decision.ok) {
    sendJson(res, decision.status, { error: decision.error })
    return
  }

  const outcome = await searchBooks(decision.term)

  // "Não achei" e "não deu para buscar" são coisas diferentes para quem está na
  // tela: no segundo caso a UI oferece o cadastro manual.
  if (outcome.unavailable) {
    sendJson(res, 503, { error: 'Busca de livros indisponível. Tente de novo em instantes.' })
    return
  }

  // Apagar e redigitar o mesmo termo não precisa queimar cota de novo.
  res.setHeader?.('Cache-Control', 'private, max-age=60')
  sendJson(res, 200, { provider: outcome.provider, results: outcome.results })
}

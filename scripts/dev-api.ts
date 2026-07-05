/**
 * Dev server local para as funcoes serverless de /api.
 *
 * Em producao essas funcoes rodam na Vercel. Localmente, este servidor
 * Express reaproveita EXATAMENTE os mesmos handlers, mantendo o mesmo
 * comportamento. O Vite faz proxy de /api para este processo (ver vite.config.ts).
 *
 * Cada handler segue a assinatura (req, res) da Vercel:
 *   - req.method, req.body (ja parseado), req.headers.cookie, req.query
 *   - res.status(n).json(body), res.setHeader(...)
 *
 * Rotas dinamicas como /api/chapters/[chapterId]/start viram /:chapterId
 * e o parametro e injetado em req.query, como a Vercel faz.
 */
import express from 'express'
import type { Request, Response } from 'express'

import authLogin from '../api/auth/login'
import authLogout from '../api/auth/logout'
import authMe from '../api/auth/me'
import adminLogin from '../api/admin/login'
import adminUsers from '../api/admin/users'
import adminChapters from '../api/admin/chapters'
import adminFinishBook from '../api/admin/current-book/finish'
import booksCurrent from '../api/books/current'
import booksReview from '../api/books/review'
import booksHistory from '../api/books/history'
import profile from '../api/profile'
import chapterStart from '../api/chapters/[chapterId]/start'
import chapterFinish from '../api/chapters/[chapterId]/finish'
import chapterComments from '../api/chapters/[chapterId]/comments'
import commentReaction from '../api/comments/[commentId]/reaction'

type VercelHandler = (req: any, res: any) => unknown | Promise<unknown>

/**
 * Adapta um handler Vercel para o Express: injeta os params da rota em
 * req.query (a Vercel expoe segmentos dinamicos via req.query) e captura
 * erros para responder 500 em vez de derrubar o processo.
 */
function wrap(handler: VercelHandler) {
  return async (req: Request, res: Response) => {
    // Em Express 5, req.query e um getter somente-leitura; substituimos a
    // propriedade por um objeto com os params da rota mesclados (a Vercel
    // expoe segmentos dinamicos via req.query).
    Object.defineProperty(req, 'query', {
      value: { ...req.query, ...req.params },
      writable: true,
      configurable: true
    })

    try {
      await handler(req, res)
    } catch (error) {
      console.error(`[api] ${req.method} ${req.originalUrl} falhou:`, error)

      if (!res.headersSent) {
        res.status(500).json({ error: 'Erro interno no servidor de desenvolvimento.' })
      }
    }
  }
}

const app = express()
app.use(express.json())

// Auth
app.all('/api/auth/login', wrap(authLogin))
app.all('/api/auth/logout', wrap(authLogout))
app.all('/api/auth/me', wrap(authMe))

// Admin
app.all('/api/admin/login', wrap(adminLogin))
app.all('/api/admin/users', wrap(adminUsers))
app.all('/api/admin/chapters', wrap(adminChapters))
app.all('/api/admin/current-book/finish', wrap(adminFinishBook))

// Livro atual, avaliacao, historico e perfil
app.all('/api/books/current', wrap(booksCurrent))
app.all('/api/books/review', wrap(booksReview))
app.all('/api/books/history', wrap(booksHistory))
app.all('/api/profile', wrap(profile))

// Capitulos (rotas dinamicas)
app.all('/api/chapters/:chapterId/start', wrap(chapterStart))
app.all('/api/chapters/:chapterId/finish', wrap(chapterFinish))
app.all('/api/chapters/:chapterId/comments', wrap(chapterComments))

// Reacoes
app.all('/api/comments/:commentId/reaction', wrap(commentReaction))

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Rota de API nao encontrada.' })
})

const port = Number(process.env.API_PORT ?? 3001)

app.listen(port, () => {
  console.log(`[api] dev server pronto em http://localhost:${port}`)
})

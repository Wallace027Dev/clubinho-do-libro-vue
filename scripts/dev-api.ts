/**
 * Dev server local para as funcoes serverless de /api.
 *
 * Em producao essas rotas rodam na Vercel atraves de uma unica funcao
 * catch-all (api/index.ts) por causa do limite de 12 functions do
 * plano Hobby. Localmente, este servidor Express delega para EXATAMENTE o
 * mesmo handler, mantendo o mesmo comportamento. O Vite faz proxy de /api
 * para este processo (ver vite.config.ts).
 *
 * Cada handler segue a assinatura (req, res) da Vercel:
 *   - req.method, req.body (ja parseado), req.headers.cookie, req.query
 *   - res.status(n).json(body), res.setHeader(...)
 *
 * Rotas dinamicas como /api/chapters/[chapterId]/start sao resolvidas pelo
 * roteador compartilhado (api/_lib/router.ts), que injeta os parametros em
 * req.query, como a Vercel faz.
 */
import express from 'express'
import type { Request, Response } from 'express'

import apiHandler from '../api/index.js'

const app = express()
app.use(express.json())

app.all('/api/{*route}', async (req: Request, res: Response) => {
  try {
    await apiHandler(req, res)
  } catch (error) {
    console.error(`[api] ${req.method} ${req.originalUrl} falhou:`, error)

    if (!res.headersSent) {
      res.status(500).json({ error: 'Erro interno no servidor de desenvolvimento.' })
    }
  }
})

const port = Number(process.env.API_PORT ?? 3001)

app.listen(port, () => {
  console.log(`[api] dev server pronto em http://localhost:${port}`)
})

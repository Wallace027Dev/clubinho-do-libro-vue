/**
 * Unica serverless function do projeto: recebe qualquer path de /api e
 * delega ao roteador (ver api/_lib/router.ts para o porque).
 */
import { matchRoute } from './_lib/router.js'

export default async function handler(req: any, res: any) {
  // Na Vercel, o rewrite de /api/:path* (vercel.json) injeta o path original
  // em __path; no dev-server (Express), usamos o req.url direto.
  const rewrittenPath = typeof req.query?.__path === 'string' ? req.query.__path : null
  const path = rewrittenPath ?? (req.url ?? '').split('?')[0]
  const segments = path.replace(/^\/api\//, '').split('/').filter(Boolean)
  const match = matchRoute(segments)

  if (!match) {
    res.status(404).json({ error: 'Rota de API nao encontrada.' })
    return
  }

  // A Vercel expoe segmentos dinamicos via req.query; reproduzimos isso para
  // os handlers. defineProperty porque no Express 5 (dev) req.query e um
  // getter somente-leitura.
  const { __path: _ignored, ...query } = { ...req.query }

  Object.defineProperty(req, 'query', {
    value: { ...query, ...match.params },
    writable: true,
    configurable: true
  })

  await match.handler(req, res)
}

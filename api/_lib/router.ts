/**
 * Roteador único das rotas de /api.
 *
 * O plano Hobby da Vercel limita o deploy a 12 serverless functions, entao
 * todas as rotas são servidas por uma única função (api/index.ts) — um
 * rewrite no vercel.json manda todo /api/* para ela — que delega para os
 * handlers em api/_routes/ (pastas com prefixo _ não viram funções na
 * Vercel).
 *
 * O dev-server local (scripts/dev-api.ts) usa este mesmo roteador, entao o
 * comportamento é idêntico nos dois ambientes.
 */
import authLogin from '../_routes/auth/login.js'
import authLogout from '../_routes/auth/logout.js'
import authMe from '../_routes/auth/me.js'
import adminLogin from '../_routes/admin/login.js'
import adminUsers from '../_routes/admin/users.js'
import adminUserById from '../_routes/admin/users/[userId].js'
import adminChapters from '../_routes/admin/chapters.js'
import adminChapterById from '../_routes/admin/chapters/[chapterId].js'
import adminFinishBook from '../_routes/admin/current-book/finish.js'
import activities from '../_routes/activities.js'
import notifications from '../_routes/notifications.js'
import booksCurrent from '../_routes/books/current.js'
import booksReview from '../_routes/books/review.js'
import booksHistory from '../_routes/books/history.js'
import bookRatings from '../_routes/books/[clubBookId]/ratings.js'
import profile from '../_routes/profile.js'
import profilePassword from '../_routes/profile/password.js'
import chapterStart from '../_routes/chapters/[chapterId]/start.js'
import chapterFinish from '../_routes/chapters/[chapterId]/finish.js'
import chapterReopen from '../_routes/chapters/[chapterId]/reopen.js'
import chapterRating from '../_routes/chapters/[chapterId]/rating.js'
import chapterComments from '../_routes/chapters/[chapterId]/comments.js'
import commentReaction from '../_routes/comments/[commentId]/reaction.js'
import pushSubscribe from '../_routes/push/subscribe.js'
import pushUnsubscribe from '../_routes/push/unsubscribe.js'

export type VercelHandler = (req: any, res: any) => unknown | Promise<unknown>

interface Route {
  pattern: string[]
  handler: VercelHandler
}

// Segmentos entre colchetes ([chapterId]) casam com qualquer valor e viram
// parametros, como nas rotas de arquivo da Vercel.
const routes: Route[] = [
  ['auth/login', authLogin],
  ['auth/logout', authLogout],
  ['auth/me', authMe],
  ['admin/login', adminLogin],
  ['admin/users', adminUsers],
  ['admin/users/[userId]', adminUserById],
  ['admin/chapters', adminChapters],
  ['admin/chapters/[chapterId]', adminChapterById],
  ['admin/current-book/finish', adminFinishBook],
  ['activities', activities],
  ['notifications', notifications],
  ['books/current', booksCurrent],
  ['books/review', booksReview],
  ['books/history', booksHistory],
  ['books/[clubBookId]/ratings', bookRatings],
  ['profile', profile],
  ['profile/password', profilePassword],
  ['chapters/[chapterId]/start', chapterStart],
  ['chapters/[chapterId]/finish', chapterFinish],
  ['chapters/[chapterId]/reopen', chapterReopen],
  ['chapters/[chapterId]/rating', chapterRating],
  ['chapters/[chapterId]/comments', chapterComments],
  ['comments/[commentId]/reaction', commentReaction],
  ['push/subscribe', pushSubscribe],
  ['push/unsubscribe', pushUnsubscribe]
].map(([pattern, handler]) => ({
  pattern: (pattern as string).split('/'),
  handler: handler as VercelHandler
}))

export interface RouteMatch {
  handler: VercelHandler
  params: Record<string, string>
}

/** Recebe os segmentos do path após /api (ex.: ['auth', 'login']). */
export function matchRoute(segments: string[]): RouteMatch | null {
  for (const route of routes) {
    if (route.pattern.length !== segments.length) {
      continue
    }

    const params: Record<string, string> = {}
    let matched = true

    for (let i = 0; i < route.pattern.length; i++) {
      const part = route.pattern[i]

      if (part.startsWith('[')) {
        params[part.slice(1, -1)] = decodeURIComponent(segments[i])
      } else if (part !== segments[i]) {
        matched = false
        break
      }
    }

    if (matched) {
      return { handler: route.handler, params }
    }
  }

  return null
}

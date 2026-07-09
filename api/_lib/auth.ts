import { SignJWT, jwtVerify } from 'jose'
import { getRequiredEnv } from './http.js'

export type SessionRole = 'ADMIN' | 'MEMBER'

export interface SessionPayload {
  userId: string | null
  role: SessionRole
}

const COOKIE_NAME = 'clubinho_session'
const EXPIRES_IN_SECONDS = 60 * 60 * 24 * 14

function getSecret() {
  return new TextEncoder().encode(getRequiredEnv('SESSION_SECRET'))
}

export async function createSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ userId: payload.userId, role: payload.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${EXPIRES_IN_SECONDS}s`)
    .sign(getSecret())
}

export async function readSession(req: any): Promise<SessionPayload | null> {
  const token = getCookie(req, COOKIE_NAME)

  if (!token) {
    return null
  }

  try {
    const verified = await jwtVerify(token, getSecret())
    const role = verified.payload.role === 'ADMIN' ? 'ADMIN' : 'MEMBER'
    const userId = typeof verified.payload.userId === 'string' ? verified.payload.userId : null

    return { userId, role }
  } catch {
    return null
  }
}

export async function requireSession(req: any, res: any): Promise<SessionPayload | null> {
  const session = await readSession(req)

  if (!session) {
    res.status(401).json({ error: 'Unauthorized.' })
    return null
  }

  return session
}

export async function requireAdmin(req: any, res: any): Promise<SessionPayload | null> {
  const session = await requireSession(req, res)

  if (!session) {
    return null
  }

  if (session.role !== 'ADMIN') {
    res.status(403).json({ error: 'Admin access required.' })
    return null
  }

  return session
}

// Em dev (http://localhost) o atributo Secure impede o browser de gravar o
// cookie; so o aplicamos em producao, onde a Vercel serve via HTTPS.
const secureAttr = process.env.NODE_ENV === 'production' ? '; Secure' : ''

export function setSessionCookie(res: any, token: string) {
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${EXPIRES_IN_SECONDS}${secureAttr}`
  )
}

export function clearSessionCookie(res: any) {
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secureAttr}`)
}

function getCookie(req: any, name: string): string | null {
  const header = req.headers.cookie

  if (!header) {
    return null
  }

  const cookies = header.split(';').map((item: string) => item.trim())
  const match = cookies.find((item: string) => item.startsWith(`${name}=`))

  return match ? decodeURIComponent(match.slice(name.length + 1)) : null
}

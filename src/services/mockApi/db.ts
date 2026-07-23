/**
 * "Banco" em memória do ambiente de HOMOLOGAÇÃO.
 *
 * Em vez de falar com o Postgres/Prisma real, o build de homologação usa este
 * armazenamento no próprio navegador. Os modelos abaixo espelham o schema
 * Prisma apenas o suficiente para o app funcionar de ponta a ponta.
 *
 * Persistência: o estado vive em `localStorage`, então recarregar a página
 * mantém a sessão e os dados de teste. `resetMockDb()` (ou limpar o storage)
 * volta ao seed inicial.
 */

import { resetRateLimits } from './rateLimit'

export type Role = 'ADMIN' | 'MEMBER'
export type ClubBookStatus = 'CURRENT' | 'FINISHED'
export type ProgressStatus = 'STARTED' | 'FINISHED'
export type ReactionType = 'GOSTEI' | 'SOFRI' | 'SURPRESO' | 'SUSPEITO' | 'DISCUTIR'

export interface MockUser {
  id: string
  login: string
  /** Guardada em texto puro — é só homologação, sem bcrypt no navegador. */
  password: string
  role: Role
  displayName: string | null
  avatarUrl: string | null
  deactivatedAt: string | null
  createdAt: string
}

export interface MockBook {
  id: string
  title: string
  author: string | null
  description: string | null
  coverUrl: string | null
}

export interface MockClubBook {
  id: string
  bookId: string
  status: ClubBookStatus
  selectedAt: string
  finishedAt: string | null
  selectedByUserId: string | null
  finishedByUserId: string | null
}

export interface MockChapter {
  id: string
  clubBookId: string
  number: number
  title: string
}

export interface MockProgress {
  id: string
  chapterId: string
  userId: string
  status: ProgressStatus
  startedAt: string
  finishedAt: string | null
}

export interface MockComment {
  id: string
  chapterId: string
  userId: string
  body: string
  createdAt: string
  updatedAt: string
}

export interface MockReaction {
  id: string
  commentId: string
  userId: string
  type: ReactionType
  updatedAt: string
}

export interface MockRating {
  id: string
  chapterId: string
  userId: string
  rating: number
}

export interface MockReview {
  id: string
  clubBookId: string
  userId: string
  rating: number
  review: string | null
  createdAt: string
}

export interface MockActivityMeta {
  chapterId?: string
  chapterNumber?: number
  chapterTitle?: string
  bookId?: string
  userId?: string
  rating?: number
}

export interface MockActivity {
  id: string
  actorId: string | null
  type: string
  message: string
  metadata: MockActivityMeta | null
  createdAt: string
}

export interface MockSession {
  userId: string | null
  role: Role
}

export interface MockDb {
  session: MockSession | null
  users: MockUser[]
  books: MockBook[]
  clubBooks: MockClubBook[]
  chapters: MockChapter[]
  progress: MockProgress[]
  comments: MockComment[]
  reactions: MockReaction[]
  ratings: MockRating[]
  reviews: MockReview[]
  activities: MockActivity[]
}

/** Senha do login administrativo em homologação (`/login/admin`). */
export const ADMIN_PASSWORD = '123456'

export const REACTION_TYPES: ReactionType[] = [
  'GOSTEI',
  'SOFRI',
  'SURPRESO',
  'SUSPEITO',
  'DISCUTIR'
]

const STORAGE_KEY = 'clubinho_mock_db_v1'

export function uid(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

/**
 * Seed inicial pedido para homologação: dois membros (joao/maria, senha
 * 123456) e admin com senha 123456. Sem livro — o admin primeiro sorteia
 * e depois cadastra o livro para começar os testes.
 */
function seed(): MockDb {
  const now = Date.now()
  const iso = (offsetMs: number) => new Date(now - offsetMs).toISOString()

  const joaoId = uid()
  const mariaId = uid()

  return {
    session: null,
    users: [
      {
        id: joaoId,
        login: 'joao',
        password: '123456',
        role: 'MEMBER',
        displayName: 'João',
        avatarUrl: null,
        deactivatedAt: null,
        createdAt: iso(2000)
      },
      {
        id: mariaId,
        login: 'maria',
        password: '123456',
        role: 'MEMBER',
        displayName: 'Maria',
        avatarUrl: null,
        deactivatedAt: null,
        createdAt: iso(1000)
      }
    ],
    books: [],
    clubBooks: [],
    chapters: [],
    progress: [],
    comments: [],
    reactions: [],
    ratings: [],
    reviews: [],
    activities: [
      {
        id: uid(),
        actorId: null,
        type: 'MEMBER_CREATED',
        message: 'João entrou no clube.',
        metadata: { userId: joaoId },
        createdAt: iso(2000)
      },
      {
        id: uid(),
        actorId: null,
        type: 'MEMBER_CREATED',
        message: 'Maria entrou no clube.',
        metadata: { userId: mariaId },
        createdAt: iso(1000)
      }
    ]
  }
}

let db: MockDb

function init() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      db = JSON.parse(raw) as MockDb
      return
    }
  } catch {
    // storage indisponível/corrompido — recomeça do seed.
  }

  db = seed()
  persist()
}

export function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
  } catch {
    // sem persistência (ex.: modo privado): segue só em memória.
  }
}

export function getDb(): MockDb {
  return db
}

/** Restaura o seed inicial (usado pelo botão "resetar" da homologação). */
export function resetMockDb() {
  db = seed()
  resetRateLimits()
  persist()
}

init()

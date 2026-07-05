export type UserRole = 'ADMIN' | 'MEMBER'

export interface AuthUser {
  id: string | null
  login: string
  role: UserRole
  displayName: string | null
  avatarUrl?: string | null
}

export interface ActivityMetadata {
  chapterId?: string
  chapterNumber?: number
  bookId?: string
  userId?: string
}

export interface Activity {
  id: string
  type: string
  message: string
  createdAt: string
  actor?: AuthUser | null
  metadata?: ActivityMetadata | null
}

export interface ChapterProgress {
  status: 'STARTED' | 'FINISHED'
  startedAt: string
  finishedAt?: string | null
}

export interface Chapter {
  id: string
  number: number
  title: string
  progress: ChapterProgress[]
}

export type ChapterCommentReactionType = 'GOSTEI' | 'SOFRI' | 'SURPRESO' | 'SUSPEITO' | 'DISCUTIR'

export interface ChapterComment {
  id: string
  body: string
  createdAt: string
  updatedAt: string
  user: {
    id: string
    login: string
    displayName: string | null
    avatarUrl?: string | null
  }
  myReaction: ChapterCommentReactionType | null
  reactions: Partial<Record<ChapterCommentReactionType, number>>
  reactionTotal: number
  recentReactions: Array<{
    type: ChapterCommentReactionType
    updatedAt: string
  }>
}

export interface BookReview {
  id: string
  rating: number
  review: string | null
  createdAt: string
  user: {
    id: string
    login: string
    displayName: string | null
    avatarUrl?: string | null
  }
}

export interface ReviewSummary {
  average: number | null
  count: number
}

export interface CurrentBook {
  id: string
  status: 'CURRENT' | 'FINISHED'
  selectedAt: string
  finishedAt?: string | null
  book: {
    id: string
    title: string
    author?: string | null
    coverUrl?: string | null
  }
  chapters: Chapter[]
  reviews?: BookReview[]
  reviewSummary?: ReviewSummary
}

export interface ClubState {
  currentBook: CurrentBook | null
  activities: Activity[]
}

export type UserRole = 'ADMIN' | 'MEMBER'

export interface AuthUser {
  id: string | null
  login: string
  role: UserRole
  displayName: string | null
  avatarUrl?: string | null
  deactivatedAt?: string | null
}

export interface ActivityMetadata {
  chapterId?: string
  chapterNumber?: number
  chapterTitle?: string
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
  /** Nota que o próprio membro deu ao capítulo (0 ou 1 item). */
  ratings?: Array<{ rating: number }>
}

export interface ChapterRatingSummary {
  id: string
  number: number
  title: string
  locked: boolean
  average: number | null
  count: number
  myRating: number | null
}

export interface BookRatings {
  book: {
    id: string
    status: 'CURRENT' | 'FINISHED'
    finishedAt?: string | null
    title: string
    author?: string | null
    coverUrl?: string | null
  }
  reviewSummary: ReviewSummary
  chapters: ChapterRatingSummary[]
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

/** Contadores vitalícios do membro logado (todos os livros, não só o atual). */
export interface ProfileStats {
  chaptersRead: number
  comments: number
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
    description?: string | null
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

export interface ArchivedComment {
  id: string
  body: string
  createdAt: string
  user: {
    id: string
    login: string
    displayName: string | null
    avatarUrl?: string | null
  }
  reactions: Partial<Record<ChapterCommentReactionType, number>>
  reactionTotal: number
}

export interface ArchivedChapter {
  id: string
  number: number
  title: string
  comments: ArchivedComment[]
}

export interface FinishedBook {
  id: string
  selectedAt: string
  finishedAt: string | null
  book: {
    id: string
    title: string
    author?: string | null
    description?: string | null
    coverUrl?: string | null
  }
  reviews: BookReview[]
  reviewSummary: ReviewSummary
  chapters: ArchivedChapter[]
  stats: {
    chapters: number
    comments: number
    reviewers: number
  }
}

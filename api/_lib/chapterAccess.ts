import { getDefaultClub } from './club'
import { prisma } from './prisma'

export async function getFinishedChapterForUser(chapterId: string, userId: string) {
  const club = await getDefaultClub()
  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    include: {
      clubBook: {
        include: { book: true }
      },
      progress: {
        where: { userId },
        select: { status: true }
      }
    }
  })

  if (!chapter || chapter.clubBook.clubId !== club.id || chapter.clubBook.status !== 'CURRENT') {
    return null
  }

  if (chapter.progress[0]?.status !== 'FINISHED') {
    return null
  }

  return { chapter, club }
}

export async function userCanReadComment(commentId: string, userId: string) {
  const comment = await prisma.chapterComment.findUnique({
    where: { id: commentId },
    include: {
      chapter: {
        include: {
          clubBook: true,
          progress: {
            where: { userId },
            select: { status: true }
          }
        }
      }
    }
  })

  if (!comment || comment.chapter.clubBook.status !== 'CURRENT') {
    return null
  }

  if (comment.chapter.progress[0]?.status !== 'FINISHED') {
    return null
  }

  return comment
}

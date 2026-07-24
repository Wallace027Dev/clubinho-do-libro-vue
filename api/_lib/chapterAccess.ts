import { getDefaultClub } from './club.js'
import { prisma } from './prisma.js'
import { isChapterUnlocked } from '../../src/domain/chapterProgress.js'

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

  if (!chapter || chapter.clubBook.clubId !== club.id) {
    return null
  }

  if (
    !isChapterUnlocked({
      clubBookStatus: chapter.clubBook.status,
      progressStatus: chapter.progress[0]?.status
    })
  ) {
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

  if (
    !comment ||
    !isChapterUnlocked({
      clubBookStatus: comment.chapter.clubBook.status,
      progressStatus: comment.chapter.progress[0]?.status
    })
  ) {
    return null
  }

  return comment
}

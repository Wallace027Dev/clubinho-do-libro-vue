import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import ReviewList from '../../../src/components/ui/ReviewList.vue'
import { resetMockDb } from '../../../src/services/mockApi/db'
import { useAuthStore } from '../../../src/stores/authStore'
import { usePlatformStore } from '../../../src/stores/platformStore'
import type { BookReview } from '../../../src/types/platform'
import ActivityDetailView from '../../../src/views/ActivityDetailView.vue'
import { freshPinia, mountAt } from '../support/mount'

/** Foto de perfil como o app salva: data URL de JPEG comprimido no aparelho. */
const FOTO = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAE='

beforeEach(() => {
  resetMockDb()
  window.localStorage.clear()
  freshPinia()
})

/**
 * Deixa o mock no estado do bug: joao concluiu o capítulo, comentou e salvou a
 * foto de perfil; maria também concluiu, então vê o comentário no feed (o feed
 * não mostra as atividades do próprio usuário). Termina logada como maria e
 * devolve o id da atividade do comentário — é por ela que a página abre.
 */
async function seedComentarioDeQuemTemFoto(): Promise<string> {
  const auth = useAuthStore()
  const platform = usePlatformStore()

  await auth.adminLogin('123456')
  await platform.selectCurrentBook('Mistborn', 'Sanderson', '')
  await platform.createChapter(1, 'Capítulo 1')
  await platform.loadHome()
  const chapterId = platform.clubState.currentBook!.chapters[0].id
  await auth.logout()

  await auth.login('joao', '123456')
  await platform.startChapter(chapterId)
  await platform.finishChapter(chapterId, { rating: 5 })
  await platform.submitChapterComment(chapterId, 'Que capítulo!')
  await auth.updateProfile({ displayName: 'João', avatarUrl: FOTO })
  await auth.logout()

  await auth.login('maria', '123456')
  await platform.startChapter(chapterId)
  await platform.finishChapter(chapterId, { rating: 4 })
  await platform.loadHome()

  const activity = platform.clubState.activities.find((item) => item.type === 'CHAPTER_COMMENTED')

  if (!activity) {
    throw new Error('seed falhou: atividade do comentário não foi criada')
  }

  return activity.id
}

describe('foto de perfil no avatar de outras páginas', () => {
  it('mostra a foto de quem comentou na página do comentário', async () => {
    const activityId = await seedComentarioDeQuemTemFoto()

    const { wrapper } = await mountAt(ActivityDetailView, `/activity/${activityId}`)
    await flushPromises()

    const avatar = wrapper.find('.avatar img')
    expect(avatar.exists()).toBe(true)
    expect(avatar.attributes('src')).toBe(FOTO)
  })

  it('mostra a foto de quem avaliou na lista de resenhas', async () => {
    const review: BookReview = {
      id: 'r-1',
      rating: 5,
      review: 'Melhor livro do ano.',
      createdAt: '2026-07-24T12:00:00.000Z',
      user: { id: 'u-1', login: 'joao', displayName: 'João', avatarUrl: FOTO }
    }

    const { wrapper } = await mountAt(ReviewList, '/', { props: { reviews: [review] } })

    const avatar = wrapper.find('.avatar img')
    expect(avatar.exists()).toBe(true)
    expect(avatar.attributes('src')).toBe(FOTO)
  })
})

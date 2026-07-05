import { defineStore } from 'pinia'
import { ref } from 'vue'
import { apiRequest } from '../services/apiClient'
import type { AuthUser, Chapter, ClubState } from '../types/platform'

interface UsersResponse {
  users: AuthUser[]
}

interface UserResponse {
  user: AuthUser
}

interface CurrentBookResponse extends ClubState {}

interface ChaptersResponse {
  chapters: Chapter[]
}

export const usePlatformStore = defineStore('platform', () => {
  const clubState = ref<ClubState>({ currentBook: null, activities: [] })
  const members = ref<AuthUser[]>([])
  const isLoading = ref(false)

  async function loadHome() {
    isLoading.value = true

    try {
      clubState.value = await apiRequest<CurrentBookResponse>('/api/books/current')
    } finally {
      isLoading.value = false
    }
  }

  async function loadMembers() {
    const response = await apiRequest<UsersResponse>('/api/admin/users')
    members.value = response.users
  }

  async function createMember(login: string, password: string, displayName: string) {
    const response = await apiRequest<UserResponse>('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify({ login, password, displayName })
    })

    members.value = [response.user, ...members.value]
    return response.user
  }

  async function selectCurrentBook(title: string, author: string) {
    await apiRequest('/api/books/current', {
      method: 'POST',
      body: JSON.stringify({ title, author })
    })
    await loadHome()
  }

  async function createChapter(number: number, title: string) {
    await apiRequest<ChaptersResponse>('/api/admin/chapters', {
      method: 'POST',
      body: JSON.stringify({ number, title })
    })
    await loadHome()
  }

  async function startChapter(chapterId: string) {
    await apiRequest(`/api/chapters/${chapterId}/start`, { method: 'POST' })
    await loadHome()
  }

  async function finishChapter(chapterId: string) {
    await apiRequest(`/api/chapters/${chapterId}/finish`, { method: 'POST' })
    await loadHome()
  }

  async function finishCurrentBook() {
    await apiRequest('/api/admin/current-book/finish', { method: 'POST' })
    await loadHome()
  }

  async function submitReview(rating: number, review: string) {
    await apiRequest('/api/books/review', {
      method: 'POST',
      body: JSON.stringify({ rating, review })
    })
    await loadHome()
  }

  return {
    clubState,
    members,
    isLoading,
    loadHome,
    loadMembers,
    createMember,
    selectCurrentBook,
    createChapter,
    startChapter,
    finishChapter,
    finishCurrentBook,
    submitReview
  }
})

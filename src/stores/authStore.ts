import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { apiRequest } from '../services/apiClient'
import type { AuthUser } from '../types/platform'

interface MeResponse {
  user: AuthUser | null
}

interface LoginResponse {
  user: AuthUser
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(null)
  const isLoading = ref(false)
  const hasLoadedSession = ref(false)

  const isAuthenticated = computed(() => Boolean(user.value))
  const isAdmin = computed(() => user.value?.role === 'ADMIN')

  async function loadSession() {
    isLoading.value = true

    try {
      const response = await apiRequest<MeResponse>('/api/auth/me')
      user.value = response.user
      hasLoadedSession.value = true
    } finally {
      isLoading.value = false
    }
  }

  async function login(loginValue: string, password: string) {
    const response = await apiRequest<LoginResponse>('/api/auth/login', {
      method: 'POST',
      // Username é sempre minúsculo (normaliza aqui e também no backend).
      body: JSON.stringify({ login: loginValue.trim().toLowerCase(), password })
    })

    user.value = response.user
  }

  async function adminLogin(password: string) {
    const response = await apiRequest<LoginResponse>('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ password })
    })

    user.value = response.user
  }

  async function logout() {
    await apiRequest('/api/auth/logout', { method: 'POST' })
    user.value = null
  }

  function setUser(nextUser: AuthUser) {
    user.value = nextUser
  }

  return {
    user,
    isLoading,
    hasLoadedSession,
    isAuthenticated,
    isAdmin,
    loadSession,
    login,
    adminLogin,
    logout,
    setUser
  }
})

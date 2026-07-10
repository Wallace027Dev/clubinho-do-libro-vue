import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from './stores/authStore'
import ActivityDetailView from './views/ActivityDetailView.vue'
import AdminLoginView from './views/AdminLoginView.vue'
import AdminView from './views/AdminView.vue'
import ChapterDetailView from './views/ChapterDetailView.vue'
import ChaptersView from './views/ChaptersView.vue'
import ReviewView from './views/ReviewView.vue'
import FeedView from './views/FeedView.vue'
import HistoryDetailView from './views/HistoryDetailView.vue'
import HistoryView from './views/HistoryView.vue'
import HomeView from './views/HomeView.vue'
import LoginView from './views/LoginView.vue'
import ProfileView from './views/ProfileView.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: HomeView, meta: { requiresAuth: true } },
    { path: '/feed', component: FeedView, meta: { requiresAuth: true } },
    { path: '/activity/:activityId', component: ActivityDetailView, meta: { requiresAuth: true } },
    { path: '/chapters', component: ChaptersView, meta: { requiresAuth: true } },
    { path: '/chapters/:chapterId', component: ChapterDetailView, meta: { requiresAuth: true } },
    { path: '/review', component: ReviewView, meta: { requiresAuth: true } },
    { path: '/history', component: HistoryView, meta: { requiresAuth: true } },
    { path: '/history/:bookId', component: HistoryDetailView, meta: { requiresAuth: true } },
    { path: '/login', component: LoginView },
    { path: '/login/admin', component: AdminLoginView },
    { path: '/admin/login', redirect: '/login/admin' },
    { path: '/admin', component: AdminView, meta: { requiresAuth: true, requiresAdmin: true } },
    { path: '/profile', component: ProfileView, meta: { requiresAuth: true } }
  ]
})

router.beforeEach(async (to) => {
  const authStore = useAuthStore()

  if (!authStore.hasLoadedSession) {
    await authStore.loadSession()
  }

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return '/login'
  }

  if (to.meta.requiresAdmin && !authStore.isAdmin) {
    return '/'
  }

  if ((to.path === '/login' || to.path === '/login/admin') && authStore.isAuthenticated) {
    return authStore.isAdmin ? '/admin' : '/'
  }

  return true
})

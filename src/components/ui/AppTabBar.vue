<script setup lang="ts">
import { Bell, BookOpen, Bookmark, Library, Newspaper, UserRound } from 'lucide-vue-next'
import type { Component } from 'vue'
import { usePlatformStore } from '../../stores/platformStore'

interface TabItem {
  to: string
  label: string
  icon: Component
  central?: boolean
}

const platformStore = usePlatformStore()

const tabs: TabItem[] = [
  { to: '/feed', label: 'Feed', icon: Newspaper },
  { to: '/chapters', label: 'Capítulos', icon: Bookmark },
  { to: '/', label: 'Início', icon: BookOpen, central: true },
  { to: '/notifications', label: 'Avisos', icon: Bell },
  { to: '/history', label: 'Lidos', icon: Library },
  { to: '/profile', label: 'Perfil', icon: UserRound }
]
</script>

<template>
  <nav class="tab-bar glass-panel" aria-label="Navegação principal">
    <RouterLink
      v-for="tab in tabs"
      :key="tab.to"
      class="tab-item"
      :class="{ 'tab-item--central': tab.central }"
      :to="tab.to"
    >
      <span class="tab-icon" aria-hidden="true">
        <component :is="tab.icon" :size="tab.central ? 26 : 21" :stroke-width="2.2" />
        <span
          v-if="tab.to === '/notifications' && platformStore.unreadNotificationsCount"
          class="tab-dot"
          :aria-label="`${platformStore.unreadNotificationsCount} não lidas`"
        ></span>
      </span>
      <span class="tab-label">{{ tab.label }}</span>
    </RouterLink>
  </nav>
</template>

<style scoped>
.tab-icon {
  position: relative;
}

.tab-dot {
  position: absolute;
  top: -0.15rem;
  right: -0.3rem;
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 50%;
  background: #d9603f;
  box-shadow: 0 0 0 2px var(--surface, #f5ecd8);
}
</style>

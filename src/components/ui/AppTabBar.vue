<script setup lang="ts">
import { BookOpen, Bookmark, Library, Newspaper, UserRound } from 'lucide-vue-next'
import type { Component } from 'vue'

interface TabItem {
  to: string
  label: string
  icon: Component
  central?: boolean
}

const tabs: TabItem[] = [
  { to: '/feed', label: 'Feed', icon: Newspaper },
  { to: '/chapters', label: 'Capítulos', icon: Bookmark },
  { to: '/', label: 'Início', icon: BookOpen, central: true },
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
      </span>
      <span class="tab-label">{{ tab.label }}</span>
    </RouterLink>
  </nav>
</template>

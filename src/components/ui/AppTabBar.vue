<script setup lang="ts">
import type { Component } from 'vue'
import ChaptersIcon from '../icons/ChaptersIcon.vue'
import FeedIcon from '../icons/FeedIcon.vue'
import HomeIcon from '../icons/HomeIcon.vue'
import ProfileIcon from '../icons/ProfileIcon.vue'
import ReadIcon from '../icons/ReadIcon.vue'

interface TabItem {
  to: string
  label: string
  icon: Component
}

// Ícones oficiais da identidade (ES'26), casados por nome com cada aba.
const tabs: TabItem[] = [
  { to: '/feed', label: 'Feed', icon: FeedIcon },
  { to: '/chapters', label: 'Capítulos', icon: ChaptersIcon },
  { to: '/', label: 'Início', icon: HomeIcon },
  { to: '/history', label: 'Lidos', icon: ReadIcon },
  { to: '/profile', label: 'Perfil', icon: ProfileIcon }
]
</script>

<template>
  <nav class="tab-bar" aria-label="Navegação principal">
    <RouterLink v-for="tab in tabs" :key="tab.to" class="tab-item" :to="tab.to">
      <span class="tab-icon" aria-hidden="true">
        <component :is="tab.icon" :size="22" />
      </span>
      <span class="visually-hidden">{{ tab.label }}</span>
    </RouterLink>
  </nav>
</template>

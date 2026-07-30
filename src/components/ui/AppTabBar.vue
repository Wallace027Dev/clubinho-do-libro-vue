<script setup lang="ts">
import { BookOpen, Bookmark, Home, MessageSquare, Smile } from 'lucide-vue-next'
import type { Component } from 'vue'

interface TabItem {
  to: string
  label: string
  icon: Component
}

const tabs: TabItem[] = [
  { to: '/feed', label: 'Feed', icon: MessageSquare },
  { to: '/chapters', label: 'Capítulos', icon: Bookmark },
  { to: '/', label: 'Início', icon: Home },
  { to: '/history', label: 'Lidos', icon: BookOpen },
  { to: '/profile', label: 'Perfil', icon: Smile }
]
</script>

<template>
  <nav class="tab-bar" aria-label="Navegação principal">
    <RouterLink v-for="tab in tabs" :key="tab.to" class="tab-item" :to="tab.to">
      <span class="tab-icon" aria-hidden="true">
        <component :is="tab.icon" :size="22" :stroke-width="2.2" />
      </span>
      <span class="visually-hidden">{{ tab.label }}</span>
    </RouterLink>
  </nav>
</template>

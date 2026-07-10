<script setup lang="ts">
interface TabItem {
  to: string
  label: string
  icon: string
  central?: boolean
}

const tabs: TabItem[] = [
  { to: '/feed', label: 'Feed', icon: '🗞️' },
  { to: '/chapters', label: 'Capítulos', icon: '🔖' },
  { to: '/', label: 'Início', icon: '📖', central: true },
  { to: '/history', label: 'Lidos', icon: '📚' },
  { to: '/profile', label: 'Perfil', icon: '👤' }
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
      <span class="tab-icon" aria-hidden="true">{{ tab.icon }}</span>
      <span class="tab-label">{{ tab.label }}</span>
    </RouterLink>
  </nav>
</template>

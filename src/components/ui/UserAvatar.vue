<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  displayName?: string | null
  login?: string | null
  avatarUrl?: string | null
  alt?: string
}>()

const initial = computed(() => props.displayName?.[0] || props.login?.[0] || '?')
const label = computed(() => props.alt || `Foto de ${props.displayName || props.login || 'membro'}`)
</script>

<template>
  <div class="avatar">
    <img v-if="avatarUrl" :src="avatarUrl" :alt="label" />
    <template v-else>{{ initial }}</template>
  </div>
</template>

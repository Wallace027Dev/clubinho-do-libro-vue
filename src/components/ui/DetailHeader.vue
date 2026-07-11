<script setup lang="ts">
import { ArrowLeft } from 'lucide-vue-next'
import { useGoBack } from '../../composables/useGoBack'

const props = withDefaults(
  defineProps<{
    title: string
    fallback?: string
  }>(),
  { fallback: '/' }
)

const goBack = useGoBack(props.fallback)
</script>

<template>
  <header class="detail-header glass-panel">
    <button class="back-button" type="button" aria-label="Voltar" @click="goBack">
      <ArrowLeft :size="20" />
    </button>
    <h2>{{ title }}</h2>
  </header>
</template>

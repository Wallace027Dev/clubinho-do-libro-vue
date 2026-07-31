<script setup lang="ts">
defineProps<{
  title: string
  coverUrl?: string | null
  small?: boolean
  /** Preenche a coluna do pai (em vez das alturas fixas de 92px/68px). */
  fill?: boolean
}>()
</script>

<template>
  <div
    class="history-cover"
    :class="{
      'history-cover--empty': !coverUrl,
      'history-cover--small': small,
      'history-cover--fill': fill
    }"
    :aria-hidden="!coverUrl ? 'true' : undefined"
  >
    <img v-if="coverUrl" :src="coverUrl" :alt="`Capa de ${title}`" />
    <template v-else>{{ title[0] }}</template>
  </div>
</template>

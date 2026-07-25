<script setup lang="ts">
/**
 * Placeholder de carregamento (shimmer). Reserva o espaço do conteúdo real
 * para a página não "pipocar" quando os dados chegam. Puramente visual.
 */
withDefaults(
  defineProps<{
    width?: string
    height?: string
    radius?: string
  }>(),
  { width: '100%', height: '1rem', radius: '8px' }
)
</script>

<template>
  <span class="skeleton" :style="{ width, height, borderRadius: radius }" aria-hidden="true"></span>
</template>

<style scoped>
.skeleton {
  display: block;
  background: linear-gradient(
    100deg,
    rgba(46, 43, 30, 0.07) 30%,
    rgba(46, 43, 30, 0.13) 50%,
    rgba(46, 43, 30, 0.07) 70%
  );
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.4s ease-in-out infinite;
}

@keyframes skeleton-shimmer {
  from {
    background-position: 200% 0;
  }
  to {
    background-position: -200% 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton {
    animation: none;
  }
}
</style>

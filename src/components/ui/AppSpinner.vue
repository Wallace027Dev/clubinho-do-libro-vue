<script setup lang="ts">
/** Spinner de carregamento (para "carregar mais", ações rápidas etc.). */
withDefaults(defineProps<{ size?: string; label?: string }>(), {
  size: '1.2rem',
  label: 'Carregando'
})
</script>

<template>
  <span
    class="spinner"
    role="status"
    :aria-label="label"
    :style="{ width: size, height: size }"
  ></span>
</template>

<style scoped>
.spinner {
  display: inline-block;
  border: 2px solid rgba(46, 43, 30, 0.22);
  border-top-color: var(--color-primary, #004ba9);
  border-radius: 50%;
  animation: spinner-rotate 0.7s linear infinite;
}

@keyframes spinner-rotate {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .spinner {
    animation-duration: 1.4s;
  }
}
</style>

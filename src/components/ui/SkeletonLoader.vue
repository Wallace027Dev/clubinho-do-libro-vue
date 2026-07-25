<script setup lang="ts">
/**
 * Skeleton loading configurável: uma grade de blocos "shimmer".
 *
 * Um único componente para todo o carregamento do app — trocar o visual é
 * editar só aqui. Configure pelas props:
 * - `rows`     → quantas linhas.
 * - `columns`  → quantos blocos por linha (colunas).
 * - `height`   → altura de cada bloco (o "tamanho").
 * - `width`    → largura de cada bloco (padrão: preenche a coluna).
 * - `radius`   → arredondamento; `gap` → espaçamento entre blocos.
 */
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    rows?: number
    columns?: number
    height?: string
    width?: string
    radius?: string
    gap?: string
    label?: string
  }>(),
  {
    rows: 1,
    columns: 1,
    height: '1rem',
    width: '100%',
    radius: '10px',
    gap: '12px',
    label: 'Carregando'
  }
)

const total = computed(() => Math.max(0, props.rows) * Math.max(1, props.columns))
</script>

<template>
  <div
    class="skeleton-loader"
    role="status"
    :aria-label="label"
    :style="{ gridTemplateColumns: `repeat(${columns}, 1fr)`, gap }"
  >
    <span
      v-for="i in total"
      :key="i"
      class="skeleton-cell"
      :style="{ height, width, borderRadius: radius }"
    ></span>
  </div>
</template>

<style scoped>
.skeleton-loader {
  display: grid;
}

.skeleton-cell {
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
  .skeleton-cell {
    animation: none;
  }
}
</style>

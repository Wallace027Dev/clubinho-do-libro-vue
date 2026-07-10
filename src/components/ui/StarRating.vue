<script setup lang="ts">
import { Star } from 'lucide-vue-next'

const props = withDefaults(
  defineProps<{
    value: number
    size?: number
  }>(),
  { size: 20 }
)

/** Fracao de preenchimento da estrela i (1 a 5): 1 = cheia, 0.5 = metade... */
function fillFor(index: number) {
  return Math.max(0, Math.min(1, props.value - (index - 1)))
}
</script>

<template>
  <span
    class="star-rating"
    role="img"
    :aria-label="`${value.toFixed(1).replace('.', ',')} de 5`"
  >
    <span
      v-for="index in 5"
      :key="index"
      class="star-rating__star"
      :style="{ width: `${size}px`, height: `${size}px` }"
    >
      <Star :size="size" class="star-rating__base" aria-hidden="true" />
      <span class="star-rating__fill" :style="{ width: `${fillFor(index) * 100}%` }">
        <Star :size="size" class="star-rating__active" aria-hidden="true" />
      </span>
    </span>
  </span>
</template>

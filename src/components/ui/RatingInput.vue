<script setup lang="ts">
import { computed } from 'vue'
import StarRating from './StarRating.vue'
import { formatRating } from '../../utils/format'

const props = withDefaults(
  defineProps<{
    modelValue: number
    size?: number
    emptyHint?: string
  }>(),
  { size: 26, emptyHint: 'Arraste para dar a nota' }
)

const emit = defineEmits<{ 'update:modelValue': [value: number] }>()

const label = computed(() =>
  props.modelValue >= 1 ? `${formatRating(props.modelValue)}/5` : props.emptyHint
)

function onInput(event: Event) {
  emit('update:modelValue', Number((event.target as HTMLInputElement).value))
}
</script>

<template>
  <div class="rating-input">
    <StarRating :value="modelValue" :size="size" />
    <input
      :value="modelValue"
      type="range"
      min="1"
      max="5"
      step="0.1"
      aria-label="Nota de 1 a 5, em passos de 0,1"
      @input="onInput"
    />
    <!-- Sem slot, mostra o rótulo padrão; com slot, o consumidor compõe o
         rodapé (ex.: nota + botão de salvar) usando o rótulo formatado. -->
    <slot :label="label">
      <span class="rating-value">{{ label }}</span>
    </slot>
  </div>
</template>

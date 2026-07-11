<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    clickable?: boolean
    ariaLabel?: string
  }>(),
  { clickable: true }
)

const emit = defineEmits<{ activate: [] }>()

function onClick() {
  if (props.clickable) {
    emit('activate')
  }
}

function onKey(event: KeyboardEvent) {
  if (!props.clickable) {
    return
  }

  event.preventDefault()
  emit('activate')
}
</script>

<template>
  <li
    class="feed-card"
    :class="{ 'is-clickable': clickable }"
    :role="clickable ? 'button' : undefined"
    :tabindex="clickable ? 0 : undefined"
    :aria-label="clickable ? ariaLabel : undefined"
    @click="onClick"
    @keydown.enter="onKey"
    @keydown.space="onKey"
  >
    <slot />
  </li>
</template>

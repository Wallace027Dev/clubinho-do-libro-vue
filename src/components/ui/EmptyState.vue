<script setup lang="ts">
defineProps<{
  message?: string
}>()
</script>

<template>
  <div class="empty-state">
    <slot>
      <p>{{ message }}</p>
    </slot>
  </div>
</template>

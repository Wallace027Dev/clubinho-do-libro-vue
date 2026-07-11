<script setup lang="ts">
defineProps<{
  label?: string
  title?: string
  subtitle?: string
}>()
</script>

<template>
  <section class="flow-card glass-panel">
    <div v-if="$slots.heading || label || title || subtitle" class="flow-heading">
      <slot name="heading">
        <p v-if="label" class="section-label">{{ label }}</p>
        <h2 v-if="title">{{ title }}</h2>
        <p v-if="subtitle">{{ subtitle }}</p>
      </slot>
    </div>

    <slot />
  </section>
</template>

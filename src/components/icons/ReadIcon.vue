<script setup lang="ts">
withDefaults(defineProps<{ size?: number }>(), { size: 22 })
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 17.5 20"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M15.01,17.85h2.16c.44.1.45,1.98,0,2.15H3.82C1.63,20.01,0,18.11,0,16.03V3.36C0,1.54,1.3.01,3.2.01h11.4c1.36-.01,2.55,1,2.55,2.44v9.26c.02,1.31-.83,2.22-2.12,2.62l-.02,3.52ZM12.85,17.85l-.04-3.59-8.91.02c-1.01,0-1.78.98-1.73,1.87.05,1,.86,1.72,1.92,1.71h8.76Z"/>
  </svg>
</template>

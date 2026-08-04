<script setup lang="ts">
withDefaults(defineProps<{ size?: number }>(), { size: 22 })
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 19.94 19.94"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M13.46,0h3.51c1.67,0,2.97,1.31,2.98,2.98v13.96c0,1.47-1.15,2.97-2.71,2.97l-14.23.02c-1.51,0-2.99-1.14-2.99-2.73l-.02-14.49C.13,1.27,1.25.03,2.74.02L6.55,0l.02,8.86c0,.16.34.46.49.47s.44-.13.54-.25l2.03-2.23c.25-.28.77.04,1.01.3l1.91,2.08c.1.11.53.12.62.03.11-.11.22-.37.3-.59V0Z"/>
  </svg>
</template>

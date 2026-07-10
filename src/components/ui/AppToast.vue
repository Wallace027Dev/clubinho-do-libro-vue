<script setup lang="ts">
import { useUiStore } from '../../stores/uiStore'

const uiStore = useUiStore()
</script>

<template>
  <Teleport to="body">
    <div class="toast-region" aria-live="polite">
      <TransitionGroup name="toast">
        <div
          v-for="toast in uiStore.toasts"
          :key="toast.id"
          class="app-toast"
          :class="`app-toast--${toast.type}`"
          role="status"
          @click="uiStore.dismissToast(toast.id)"
        >
          <span class="app-toast__icon" aria-hidden="true">
            {{ toast.type === 'success' ? '✓' : '!' }}
          </span>
          <p>{{ toast.message }}</p>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

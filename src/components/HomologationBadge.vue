<script setup lang="ts">
import { FlaskConical, RotateCcw } from 'lucide-vue-next'
import { resetMockDb } from '../services/mockApi'

function resetData() {
  const confirmed = window.confirm(
    'Resetar os dados de teste? Isso apaga tudo criado em homologação e volta ao seed inicial (admin e membros joao/maria, senha 123456, sem livro).'
  )

  if (!confirmed) return

  resetMockDb()
  // Recarrega para o app reler a sessão/estado já zerados.
  window.location.reload()
}
</script>

<template>
  <div class="homolog-badge" role="status">
    <span class="homolog-badge__label">
      <FlaskConical :size="15" aria-hidden="true" />
      Homologação · dados em memória
    </span>
    <button type="button" class="homolog-badge__reset" @click="resetData">
      <RotateCcw :size="14" aria-hidden="true" />
      Resetar
    </button>
  </div>
</template>

<style scoped>
.homolog-badge {
  position: fixed;
  bottom: calc(96px + env(safe-area-inset-bottom, 0px));
  left: 12px;
  z-index: 40;
  display: flex;
  gap: 8px;
  align-items: center;
  max-width: calc(100% - 24px);
  padding: 6px 8px 6px 12px;
  border: 1px solid rgba(124, 90, 34, 0.4);
  border-radius: 999px;
  background: var(--color-card);
  box-shadow: 0 10px 24px rgba(46, 43, 30, 0.22);
  font-size: 0.74rem;
  font-weight: 700;
  color: #7c5a22;
}

.homolog-badge__label {
  display: inline-flex;
  gap: 6px;
  align-items: center;
}

.homolog-badge__reset {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  min-height: 30px;
  padding: 0 10px;
  border: 0;
  border-radius: 999px;
  background: rgba(124, 90, 34, 0.14);
  color: #7c5a22;
  font-size: 0.72rem;
  font-weight: 700;
}

.homolog-badge__reset:hover {
  background: rgba(124, 90, 34, 0.22);
}

@media (max-width: 360px) {
  .homolog-badge__label {
    display: none;
  }
}
</style>

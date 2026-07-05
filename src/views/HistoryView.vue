<script setup lang="ts">
import { computed, onMounted } from 'vue'
import HistoryBookCard from '../components/HistoryBookCard.vue'
import { usePlatformStore } from '../stores/platformStore'

const platformStore = usePlatformStore()
const history = computed(() => platformStore.history)

onMounted(() => {
  void platformStore.loadHistory()
})
</script>

<template>
  <section class="flow-card glass-panel">
    <div class="flow-heading">
      <p class="section-label">Historico</p>
      <h2>Livros lidos</h2>
      <p>A memoria do clube: notas, resenhas e comentarios dos livros ja finalizados.</p>
    </div>

    <div v-if="platformStore.isLoading && !history.length" class="empty-state">
      <p>Carregando historico...</p>
    </div>

    <div v-else-if="!history.length" class="empty-state">
      <p>Nenhum livro finalizado ainda. Quando o clube encerrar um livro, ele aparece aqui.</p>
    </div>
  </section>

  <HistoryBookCard v-for="book in history" :key="book.id" :book="book" />
</template>

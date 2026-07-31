<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import BookEntryStep from '../components/BookEntryStep.vue'
import CurrentMonthBook from '../components/CurrentMonthBook.vue'
import RouletteStep from '../components/RouletteStep.vue'
import WinnerModal from '../components/WinnerModal.vue'
import BaseButton from '../components/ui/BaseButton.vue'
import SectionCard from '../components/ui/SectionCard.vue'
import { usePlatformStore } from '../stores/platformStore'
import { useRaffleStore } from '../stores/raffleStore'

const platformStore = usePlatformStore()
const raffleStore = useRaffleStore()
const router = useRouter()

// A trava do sorteio depende do livro atual do clube: sem carregar, a roleta
// fica travada (fail-closed) em vez de liberar por engano.
onMounted(() => {
  void platformStore.loadHome()
})
</script>

<template>
  <SectionCard
    label="Admin"
    title="Sorteador de livros"
    subtitle="Cadastre os candidatos, gire a roleta e aceite o vencedor — ele vira o livro atual do clube. Só é possível sortear quando o livro atual estiver concluído."
  >
    <BaseButton variant="outline" @click="router.push('/admin')">
      Voltar ao painel
    </BaseButton>
  </SectionCard>

  <CurrentMonthBook />

  <BookEntryStep v-if="raffleStore.step === 'entry'" />
  <RouletteStep v-else />

  <WinnerModal />
</template>

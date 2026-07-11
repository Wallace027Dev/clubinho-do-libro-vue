<script setup lang="ts">
import { useRouter } from 'vue-router'
import BookEntryStep from '../components/BookEntryStep.vue'
import CurrentMonthBook from '../components/CurrentMonthBook.vue'
import RouletteStep from '../components/RouletteStep.vue'
import WinnerModal from '../components/WinnerModal.vue'
import BaseButton from '../components/ui/BaseButton.vue'
import SectionCard from '../components/ui/SectionCard.vue'
import { useRaffleStore } from '../stores/raffleStore'

const raffleStore = useRaffleStore()
const router = useRouter()
</script>

<template>
  <SectionCard
    label="Admin"
    title="Sorteador de livros"
    subtitle="Cadastre os candidatos, gire a roleta e aceite o livro do mês. Só é possível sortear quando virar o mês e não houver mais um livro escolhido."
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

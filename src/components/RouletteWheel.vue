<script setup lang="ts">
import { computed } from 'vue'
import { useRaffleStore } from '../stores/raffleStore'

const raffleStore = useRaffleStore()

const wheelStyle = computed(() => {
  const books = raffleStore.books
  const segmentSize = 360 / books.length

  const gradient = books
    .map((book, index) => {
      const start = index * segmentSize
      const end = start + segmentSize

      return `${book.color} ${start}deg ${end}deg`
    })
    .join(', ')

  return {
    background: `conic-gradient(${gradient})`,
    transform: `rotate(${raffleStore.wheelRotation}deg)`
  }
})
</script>

<template>
  <div class="wheel-wrap" aria-label="Roleta de livros">
    <div class="wheel-pointer" aria-hidden="true"></div>
    <div class="wheel" :class="{ spinning: raffleStore.isSpinning }" :style="wheelStyle">
      <div class="wheel-center">
        <span>clubin.</span>
      </div>
    </div>
  </div>

  <ol class="wheel-legend" aria-label="Livros na roleta">
    <li v-for="book in raffleStore.books" :key="book.id">
      <span class="book-color-dot" :style="{ backgroundColor: book.color }" aria-hidden="true"></span>
      {{ book.title }}
    </li>
  </ol>
</template>

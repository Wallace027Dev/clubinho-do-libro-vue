<script setup lang="ts">
import StarRating from './StarRating.vue'
import UserAvatar from './UserAvatar.vue'
import type { BookReview } from '../../types/platform'

defineProps<{
  reviews: BookReview[]
}>()
</script>

<template>
  <ol class="review-list">
    <li v-for="review in reviews" :key="review.id">
      <div class="review-head">
        <UserAvatar :display-name="review.user.displayName" :login="review.user.login" />
        <div>
          <strong>{{ review.user.displayName || review.user.login }}</strong>
          <StarRating :value="review.rating" :size="16" />
        </div>
      </div>
      <p v-if="review.review" class="comment-body">{{ review.review }}</p>
    </li>
  </ol>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import BaseButton from '../components/ui/BaseButton.vue'
import BookCover from '../components/ui/BookCover.vue'
import ClickableCard from '../components/ui/ClickableCard.vue'
import DetailHeader from '../components/ui/DetailHeader.vue'
import EmptyState from '../components/ui/EmptyState.vue'
import RatingInput from '../components/ui/RatingInput.vue'
import ReviewList from '../components/ui/ReviewList.vue'
import SectionCard from '../components/ui/SectionCard.vue'
import StarRating from '../components/ui/StarRating.vue'
import UserAvatar from '../components/ui/UserAvatar.vue'
import type { BookReview } from '../types/platform'

/* ------------------------------------------------------------------
   Editor de tokens ao vivo. Cada token escreve direto no :root via
   style inline, então TODO o app (e as previews abaixo) reagem na hora.
   ------------------------------------------------------------------ */
interface TokenControl {
  name: string
  label: string
  kind: 'color' | 'size'
  value: string
  def: string
  unit?: string
  min?: number
  max?: number
  step?: number
}

interface TokenGroup {
  title: string
  tokens: TokenControl[]
}

const tokenGroups = reactive<TokenGroup[]>([
  {
    title: 'Cores',
    tokens: [
      { name: '--color-olive-800', label: 'Primária', kind: 'color', value: '#004ba9', def: '#004ba9' },
      { name: '--color-olive-650', label: 'Primária clara', kind: 'color', value: '#1f60b3', def: '#1f60b3' },
      { name: '--color-olive-950', label: 'Títulos', kind: 'color', value: '#4b261d', def: '#4b261d' },
      { name: '--color-caramel-300', label: 'Acento', kind: 'color', value: '#933012', def: '#933012' },
      { name: '--color-cream-50', label: 'Sobre primária', kind: 'color', value: '#f7f3df', def: '#f7f3df' },
      { name: '--color-ink', label: 'Texto', kind: 'color', value: '#4b261d', def: '#4b261d' },
      { name: '--color-paper', label: 'Fundo (papel)', kind: 'color', value: '#f3efd6', def: '#f3efd6' },
      { name: '--color-card', label: 'Cartão', kind: 'color', value: '#fdfbef', def: '#fdfbef' },
      { name: '--color-card-edge', label: 'Borda do cartão', kind: 'color', value: '#ddd2ad', def: '#ddd2ad' },
      { name: '--color-star', label: 'Estrela', kind: 'color', value: '#c9992e', def: '#c9992e' },
      { name: '--color-star-stroke', label: 'Estrela (borda)', kind: 'color', value: '#a87a1f', def: '#a87a1f' }
    ]
  },
  {
    title: 'Raios de canto',
    tokens: [
      { name: '--radius-panel', label: 'Painel', kind: 'size', value: '18', def: '18', unit: 'px', min: 0, max: 48, step: 1 },
      { name: '--radius-control', label: 'Controle', kind: 'size', value: '12', def: '12', unit: 'px', min: 0, max: 40, step: 1 }
    ]
  },
  {
    title: 'Tipografia',
    tokens: [
      { name: '--font-size-xl', label: 'Título (h2)', kind: 'size', value: '1.5', def: '1.5', unit: 'rem', min: 1, max: 2.6, step: 0.05 }
    ]
  }
])

function applyToken(token: TokenControl) {
  const value = token.kind === 'size' ? `${token.value}${token.unit ?? ''}` : token.value
  document.documentElement.style.setProperty(token.name, value)
}

function resetTokens() {
  for (const group of tokenGroups) {
    for (const token of group.tokens) {
      token.value = token.def
      document.documentElement.style.removeProperty(token.name)
    }
  }
}

/* ------------------------------------------------------------------
   Estado das props de cada componente da galeria.
   ------------------------------------------------------------------ */
const button = reactive({
  variant: 'primary' as 'primary' | 'secondary' | 'outline',
  label: 'Confirmar',
  loading: false,
  disabled: false
})

const section = reactive({
  label: 'Seção',
  title: 'Título do card',
  subtitle: 'Uma descrição curta de apoio para a seção.'
})

const avatar = reactive({
  displayName: 'Ana Prado',
  login: 'ana',
  avatarUrl: ''
})

const empty = reactive({ message: 'Nada por aqui ainda.' })

const cover = reactive({ title: 'Mistborn', coverUrl: '', small: false, fill: false })

const rating = ref(4)
const star = reactive({ value: 3.6, size: 24 })
const clickable = reactive({ label: 'Toque para abrir' })
const detail = reactive({ title: 'Capítulo 3' })

const sampleReviews: BookReview[] = [
  {
    id: 'r1',
    rating: 4.8,
    review: 'Fechei o livro às 3h da manhã. Vale cada capítulo.',
    createdAt: new Date().toISOString(),
    user: { id: 'u1', login: 'ana', displayName: 'Ana Prado', avatarUrl: null }
  },
  {
    id: 'r2',
    rating: 3.5,
    review: null,
    createdAt: new Date().toISOString(),
    user: { id: 'u2', login: 'bruno', displayName: 'Bruno Sá', avatarUrl: null }
  }
]
</script>

<template>
  <SectionCard
    label="Design system"
    title="Playground de componentes"
    subtitle="Edite os tokens de design e as props: tudo muda ao vivo. É a referência única do visual do clube."
  >
    <RouterLink class="text-link" to="/admin">Voltar ao painel</RouterLink>
  </SectionCard>

  <!-- ---------- Editor de tokens ---------- -->
  <SectionCard label="Tokens" title="Variáveis de design">
    <p class="pg-hint">
      Mexer aqui reescreve as CSS variables no <code>:root</code> — os componentes
      abaixo (e o app inteiro) reagem na hora.
    </p>

    <div v-for="group in tokenGroups" :key="group.title" class="pg-token-group">
      <p class="section-label">{{ group.title }}</p>
      <div class="pg-token-grid">
        <label v-for="token in group.tokens" :key="token.name" class="pg-token">
          <span class="pg-token-label">{{ token.label }}</span>

          <span v-if="token.kind === 'color'" class="pg-color-control">
            <input type="color" v-model="token.value" @input="applyToken(token)" />
            <code>{{ token.value }}</code>
          </span>

          <span v-else class="pg-size-control">
            <input
              type="range"
              :min="token.min"
              :max="token.max"
              :step="token.step"
              v-model="token.value"
              @input="applyToken(token)"
            />
            <code>{{ token.value }}{{ token.unit }}</code>
          </span>
        </label>
      </div>
    </div>

    <BaseButton variant="outline" @click="resetTokens">Restaurar padrão</BaseButton>
  </SectionCard>

  <!-- ---------- BaseButton ---------- -->
  <SectionCard label="Componente" title="BaseButton">
    <div class="pg-preview">
      <BaseButton :variant="button.variant" :loading="button.loading" :disabled="button.disabled">
        {{ button.label }}
      </BaseButton>
    </div>
    <div class="pg-controls">
      <label>
        Variante
        <select v-model="button.variant">
          <option value="primary">primary</option>
          <option value="secondary">secondary</option>
          <option value="outline">outline</option>
        </select>
      </label>
      <label>
        Texto
        <input v-model="button.label" />
      </label>
      <label class="pg-check">
        <input type="checkbox" v-model="button.loading" /> loading
      </label>
      <label class="pg-check">
        <input type="checkbox" v-model="button.disabled" /> disabled
      </label>
    </div>
  </SectionCard>

  <!-- ---------- SectionCard ---------- -->
  <SectionCard label="Componente" title="SectionCard">
    <div class="pg-preview">
      <SectionCard :label="section.label" :title="section.title" :subtitle="section.subtitle">
        <p class="comment-muted">Conteúdo do card entra pelo slot padrão.</p>
      </SectionCard>
    </div>
    <div class="pg-controls">
      <label>Rótulo <input v-model="section.label" /></label>
      <label>Título <input v-model="section.title" /></label>
      <label>Subtítulo <input v-model="section.subtitle" /></label>
    </div>
  </SectionCard>

  <!-- ---------- UserAvatar ---------- -->
  <SectionCard label="Componente" title="UserAvatar">
    <div class="pg-preview">
      <UserAvatar
        :display-name="avatar.displayName"
        :login="avatar.login"
        :avatar-url="avatar.avatarUrl || null"
      />
    </div>
    <div class="pg-controls">
      <label>Nome <input v-model="avatar.displayName" /></label>
      <label>Login <input v-model="avatar.login" /></label>
      <label>URL da foto <input v-model="avatar.avatarUrl" placeholder="deixe vazio p/ inicial" /></label>
    </div>
  </SectionCard>

  <!-- ---------- StarRating + RatingInput ---------- -->
  <SectionCard label="Componente" title="StarRating & RatingInput">
    <div class="pg-preview pg-preview--column">
      <StarRating :value="star.value" :size="star.size" />
      <RatingInput v-model="rating" />
      <p class="comment-muted">RatingInput (v-model): {{ rating }}</p>
    </div>
    <div class="pg-controls">
      <label>
        StarRating valor ({{ star.value }})
        <input type="range" min="0" max="5" step="0.1" v-model.number="star.value" />
      </label>
      <label>
        StarRating tamanho ({{ star.size }}px)
        <input type="range" min="12" max="48" step="1" v-model.number="star.size" />
      </label>
    </div>
  </SectionCard>

  <!-- ---------- BookCover ---------- -->
  <SectionCard label="Componente" title="BookCover">
    <div class="pg-preview">
      <BookCover
        :title="cover.title"
        :cover-url="cover.coverUrl || null"
        :small="cover.small"
        :fill="cover.fill"
      />
    </div>
    <div class="pg-controls">
      <label>Título <input v-model="cover.title" /></label>
      <label>URL da capa <input v-model="cover.coverUrl" placeholder="deixe vazio p/ inicial" /></label>
      <label class="pg-check"><input type="checkbox" v-model="cover.small" /> small</label>
      <label class="pg-check"><input type="checkbox" v-model="cover.fill" /> fill</label>
    </div>
  </SectionCard>

  <!-- ---------- ReviewList ---------- -->
  <SectionCard label="Componente" title="ReviewList">
    <div class="pg-preview">
      <ReviewList :reviews="sampleReviews" />
    </div>
  </SectionCard>

  <!-- ---------- ClickableCard ---------- -->
  <SectionCard label="Componente" title="ClickableCard">
    <div class="pg-preview">
      <ol class="feed-list">
        <ClickableCard :aria-label="clickable.label" @activate="() => {}">
          <div class="feed-card-top">
            <span class="feed-tag">Exemplo</span>
          </div>
          <strong>{{ clickable.label }}</strong>
          <p>Emite <code>activate</code> no clique, Enter e Espaço.</p>
        </ClickableCard>
      </ol>
    </div>
    <div class="pg-controls">
      <label>Texto <input v-model="clickable.label" /></label>
    </div>
  </SectionCard>

  <!-- ---------- EmptyState ---------- -->
  <SectionCard label="Componente" title="EmptyState">
    <div class="pg-preview">
      <EmptyState :message="empty.message" />
    </div>
    <div class="pg-controls">
      <label>Mensagem <input v-model="empty.message" /></label>
    </div>
  </SectionCard>

  <!-- ---------- DetailHeader ---------- -->
  <SectionCard label="Componente" title="DetailHeader">
    <div class="pg-preview">
      <DetailHeader :title="detail.title" fallback="/design" />
    </div>
    <div class="pg-controls">
      <label>Título <input v-model="detail.title" /></label>
    </div>
  </SectionCard>
</template>

<style scoped>
.pg-hint {
  margin: 0 0 14px;
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
  line-height: 1.45;
}

.pg-hint code,
.pg-controls code,
.pg-preview code {
  padding: 1px 5px;
  border-radius: 6px;
  background: rgba(0, 75, 169, 0.12);
  font-size: 0.85em;
}

.pg-token-group {
  margin-bottom: 16px;
}

.pg-token-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
}

.pg-token {
  display: grid;
  gap: 6px;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-bark-700);
}

.pg-color-control {
  display: flex;
  gap: 8px;
  align-items: center;
}

.pg-color-control input[type='color'] {
  width: 44px;
  height: 36px;
  min-height: 0;
  padding: 2px;
  border-radius: 10px;
}

.pg-size-control {
  display: grid;
  gap: 4px;
}

.pg-size-control input[type='range'] {
  min-height: 0;
  padding: 0;
  border: 0;
  background: transparent;
  box-shadow: none;
  accent-color: var(--color-olive-650);
}

/* Preview em fundo levemente contrastante para separar do card. */
.pg-preview {
  display: grid;
  gap: 10px;
  place-items: center;
  margin-bottom: 14px;
  padding: 18px;
  border: 1px dashed rgba(0, 75, 169, 0.24);
  border-radius: var(--radius-lg);
  background: rgba(255, 255, 255, 0.22);
}

.pg-preview--column {
  justify-items: start;
}

.pg-preview > * {
  width: 100%;
}

.pg-controls {
  display: grid;
  gap: 12px;
}

.pg-controls > label {
  display: grid;
  gap: 6px;
  color: var(--color-bark-700);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
}

.pg-controls select {
  width: 100%;
  min-height: 52px;
  border: 1px solid rgba(255, 255, 255, 0.66);
  border-radius: var(--radius-control);
  background: rgba(255, 255, 255, 0.5);
  color: var(--color-ink);
  padding: 0 14px;
  font-size: 16px;
}

.pg-controls .pg-check {
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
}

.pg-controls .pg-check input {
  width: auto;
  min-height: 0;
  accent-color: var(--color-olive-650);
}
</style>

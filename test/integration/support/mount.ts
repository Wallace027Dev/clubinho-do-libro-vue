import { mount, type ComponentMountingOptions } from '@vue/test-utils'
import { createPinia, setActivePinia, type Pinia } from 'pinia'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import type { Component } from 'vue'

// Router de memória com as mesmas rotas do app (componentes stub), suficiente
// para os `router.push(...)` e `useRoute().params` dos componentes testados.
const stub: Component = { template: '<div />' }
const paths = [
  '/',
  '/login',
  '/login/admin',
  '/admin',
  '/feed',
  '/activity/:activityId',
  '/chapters',
  '/chapters/:chapterId',
  '/review',
  '/books/:clubBookId/ratings',
  '/history',
  '/history/:bookId',
  '/profile'
]

export function createTestRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: paths.map((path) => ({ path, component: stub }))
  })
}

/**
 * Monta um componente com Pinia real + router de memória posicionado em `path`.
 * Devolve o wrapper, o router e a pinia (para inspecionar a store no teste).
 */
export async function mountAt(
  component: Component,
  path = '/',
  options: ComponentMountingOptions<any> = {}
) {
  const pinia = createPinia()
  setActivePinia(pinia)

  const router = createTestRouter()
  await router.push(path)
  await router.isReady()

  const { global: globalOptions, ...rest } = options
  const wrapper = mount(component, {
    ...rest,
    global: {
      ...globalOptions,
      plugins: [pinia, router, ...(globalOptions?.plugins ?? [])]
    }
  })

  return { wrapper, router, pinia }
}

/** Para testes de store puros: ativa uma Pinia nova e devolve. */
export function freshPinia(): Pinia {
  const pinia = createPinia()
  setActivePinia(pinia)
  return pinia
}

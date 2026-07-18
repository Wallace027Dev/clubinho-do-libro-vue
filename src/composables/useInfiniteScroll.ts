import { onBeforeUnmount, watch, type Ref } from 'vue'

/**
 * Scroll infinito genérico via IntersectionObserver.
 *
 * Passe o `target` (uma template ref ligada a um elemento no fim da lista,
 * renderizado só enquanto houver mais itens). Quando ele entra na viewport,
 * `onLoadMore` é chamado; enquanto a promessa não resolve, novas chamadas
 * ficam bloqueadas.
 *
 * `onLoadMore` deve devolver se ainda há mais para carregar. Enquanto for
 * `true` e o sentinel continuar visível (lista curta demais para rolar), o
 * carregamento se repete para preencher a tela; ao devolver `false`, para.
 */
export function useInfiniteScroll(
  target: Ref<HTMLElement | null>,
  onLoadMore: () => boolean | Promise<boolean>
) {
  let observer: IntersectionObserver | null = null
  let busy = false

  async function handle(entries: IntersectionObserverEntry[]) {
    if (busy || !entries.some((entry) => entry.isIntersecting)) {
      return
    }

    busy = true
    let more = false
    try {
      more = await onLoadMore()
    } finally {
      busy = false
    }

    // Ainda visível e com mais itens: re-observa para continuar preenchendo.
    if (more && target.value && observer) {
      observer.unobserve(target.value)
      observer.observe(target.value)
    }
  }

  watch(target, (element) => {
    observer?.disconnect()

    if (element) {
      observer = new IntersectionObserver(handle, { rootMargin: '300px' })
      observer.observe(element)
    }
  })

  onBeforeUnmount(() => observer?.disconnect())
}

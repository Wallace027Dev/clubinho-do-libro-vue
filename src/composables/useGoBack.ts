import { useRouter } from 'vue-router'

/**
 * Devolve uma função que volta na história do navegador; se a página foi
 * aberta por link direto (sem história), navega para a rota de fallback.
 * Compartilhado pelo cabeçalho de detalhe e por botões de "cancelar/voltar".
 */
export function useGoBack(fallback = '/') {
  const router = useRouter()

  return function goBack() {
    if (window.history.length > 1) {
      router.back()
      return
    }

    void router.push(fallback)
  }
}

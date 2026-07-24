/// <reference types="vite/client" />

/**
 * Flag de build injetada pelo Vite (`define`): quando `true`, o app usa o
 * mock de homologação (banco em memória no navegador) no lugar do backend.
 */
declare const __USE_MOCK_API__: boolean

interface ImportMetaEnv {
  /** Chave pública VAPID para assinar o Web Push (produção). */
  readonly VITE_VAPID_PUBLIC_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

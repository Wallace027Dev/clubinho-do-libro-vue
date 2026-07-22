// Stub de localStorage para os testes rodarem em ambiente Node.
// O "banco" em memória do mock de homologação (src/services/mockApi/db.ts)
// lê/escreve localStorage já no carregamento do módulo.
const store = new Map<string, string>()

const localStorageStub: Storage = {
  get length() {
    return store.size
  },
  clear: () => store.clear(),
  getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
  key: (index: number) => Array.from(store.keys())[index] ?? null,
  removeItem: (key: string) => void store.delete(key),
  setItem: (key: string, value: string) => void store.set(key, String(value))
}

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageStub,
  writable: true,
  configurable: true
})

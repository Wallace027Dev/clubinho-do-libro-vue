// Setup compartilhado pelos projects de teste.
//
// - Node (unit): não tem localStorage; o "banco" em memória do mock usa no
//   carregamento, então stubamos.
// - jsdom (integration): já tem localStorage, mas não tem IntersectionObserver,
//   usado pelo scroll infinito — stubamos um no-op para os componentes montarem.

if (!('localStorage' in globalThis)) {
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
}

if (!('IntersectionObserver' in globalThis)) {
  class IntersectionObserverStub {
    constructor(_cb: unknown) {}
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return []
    }
  }
  Object.defineProperty(globalThis, 'IntersectionObserver', {
    value: IntersectionObserverStub,
    writable: true,
    configurable: true
  })
}

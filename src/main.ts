import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router'
import './styles/main.css'

createApp(App).use(createPinia()).use(router).mount('#app')

const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

if (!reduceMotion && 'DeviceOrientationEvent' in window) {
  window.addEventListener(
    'deviceorientation',
    (event) => {
      if (event.gamma === null && event.beta === null) {
        return
      }

      const x = Math.max(-1, Math.min(1, (event.gamma ?? 0) / 35))
      const y = Math.max(-1, Math.min(1, (event.beta ?? 0) / 55))

      document.documentElement.classList.add('motion-gradient')
      document.documentElement.style.setProperty('--gradient-motion-x', `${x * 11}vmax`)
      document.documentElement.style.setProperty('--gradient-motion-y', `${y * 7}vmax`)
    },
    { passive: true }
  )
}

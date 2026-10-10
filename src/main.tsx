import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

const el = document.getElementById('root')
if (el) {
  // No StrictMode: double-invoked effects would build the 120k-particle
  // sculpture twice and mount two WebGL contexts in development.
  createRoot(el).render(<App />)
}

// The pre-boot void is only needed until the app paints its own background.
requestAnimationFrame(() => {
  document.querySelector('.boot-void')?.remove()
})

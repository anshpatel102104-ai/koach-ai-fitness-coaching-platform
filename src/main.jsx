import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { initTheme } from '@/lib/theme'

// Apply the coach's saved theme (or OS preference) before first paint.
initTheme()

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
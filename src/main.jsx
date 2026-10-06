import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { initTheme } from '@/lib/theme'
import { installGlobalErrorHandlers } from '@/lib/errorReporting'

// Uncaught errors / unhandled rejections / failed chunk loads -> error monitoring.
installGlobalErrorHandlers()

// Apply the coach's saved theme (or OS preference) before first paint.
initTheme()

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
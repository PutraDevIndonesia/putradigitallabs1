import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { ToastProvider } from './components/Toast.jsx'
import { LocaleProvider } from './i18n/index.jsx'
import './styles/tokens.css'
import './styles/base.css'
import './styles/components.css'
import './styles/forms.css'
import './styles/public.css'
import './styles/admin.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <LocaleProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </LocaleProvider>
    </BrowserRouter>
  </StrictMode>,
)

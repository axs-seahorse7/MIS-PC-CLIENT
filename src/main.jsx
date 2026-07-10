import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BrowserRouter as Router } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import misTheme from './Global/antdTheme'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ConfigProvider theme={misTheme}>
      <Router>
        <App />
      </Router>
    </ConfigProvider>
  </StrictMode>,
)
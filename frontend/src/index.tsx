import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css' // <--- 必须添加这行

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
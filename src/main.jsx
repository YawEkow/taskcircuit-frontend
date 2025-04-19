import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx' // Ensure this points to your App component file
import './index.css'     // Import the Tailwind directives CSS

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)


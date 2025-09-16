import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/ui/App';
import './styles/index.css';
import 'antd/dist/reset.css';

// Debug: verify client boot
// eslint-disable-next-line no-console
console.log('[Main] Booting client...');

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

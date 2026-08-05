import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';
import { initDataService } from './services/dataService';

// Pre-load live API data (no-op in mock mode) before rendering so all
// dataService reads return real data synchronously from the first paint.
initDataService().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});

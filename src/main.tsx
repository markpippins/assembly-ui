import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';
import { initDataService } from './services/dataService';

// Render immediately — do NOT block first paint on the data preload.
// initDataService() runs in the background and emits a change notification
// when liveCache is populated; LiveDataProvider bumps its version and every
// mounted view re-reads from the cache (render-first, hydrate-later).
// Blocking on preload here caused multi-minute blank pages once agent-record
// volume grew past ~8k rows (82 paginated content pages before first paint).
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

initDataService().catch((err) => {
  // initDataService handles failures internally (empty cache + console
  // error); this catch only guards against unexpected sync throws so the
  // rendered shell is never torn down by the preload path.
  console.error('[main] initDataService crashed:', err);
});

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BabyBotQueryProvider } from '@acme/baby-bot-data-access';
import { App } from './app/App';
import { AuthGate } from './app/AuthGate';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BabyBotQueryProvider>
      <AuthGate>
        <App />
      </AuthGate>
    </BabyBotQueryProvider>
  </StrictMode>,
);

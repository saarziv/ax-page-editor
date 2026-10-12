import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { App } from '@/app/App';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Missing #root element in index.html');

const queryClient = new QueryClient();

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      {/* Devtools render only in dev; Vite strips them from production builds. */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </StrictMode>,
);

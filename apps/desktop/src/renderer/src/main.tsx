import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { ResponsiveProvider } from '@/components/responsive';
import { Toaster } from '@/components/ui/sonner';
import { router } from '@/routes';
import './assets/index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element #root not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ResponsiveProvider>
        <RouterProvider router={router} />
      </ResponsiveProvider>
      <Toaster closeButton expand position="bottom-center" visibleToasts={4} />
    </QueryClientProvider>
  </StrictMode>,
);

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App';
import './index.css';
import { v4 as uuidv4 } from 'uuid';

// Ensure device ID exists for mobile sync
if (!localStorage.getItem('ww_device_id')) {
  localStorage.setItem('ww_device_id', uuidv4());
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,      // 30 seconds
      gcTime: 5 * 60 * 1000,     // 5 minutes
      retry: 2,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || 'dummy-client-id'}>
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <App />
          <Toaster
            position="top-right"
            theme="dark"
            toastOptions={{
              style: {
                background: '#1e293b',
                border: '1px solid rgba(148,163,184,0.1)',
                color: '#f1f5f9',
              },
            }}
          />
        </QueryClientProvider>
      </BrowserRouter>
    </GoogleOAuthProvider>
  </React.StrictMode>
);

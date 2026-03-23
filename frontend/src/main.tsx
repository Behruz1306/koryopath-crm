import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { Toaster } from 'react-hot-toast';
import { ConvexProvider } from 'convex/react';
import { convex } from './lib/convex';
import App from './App';
import './i18n/config';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConvexProvider client={convex}>
      <HelmetProvider>
        <BrowserRouter>
          <App />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#1f2937',
                color: '#f9fafb',
                borderRadius: '0.75rem',
              },
              success: { iconTheme: { primary: '#10b981', secondary: '#f9fafb' } },
              error: { iconTheme: { primary: '#ef4444', secondary: '#f9fafb' } },
            }}
          />
        </BrowserRouter>
      </HelmetProvider>
    </ConvexProvider>
  </React.StrictMode>
);

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import App from './App';
import { AlertProvider } from './componentes/AlertProvider';
import { AvisoVersion } from './componentes/AvisoVersion';
import { ErrorBoundary } from './componentes/ErrorBoundary';
import { AuthProvider } from './contexto/AuthContext';
import './estilos.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AlertProvider>
        <AuthProvider>
          <BrowserRouter>
            <App />
            <AvisoVersion />
          </BrowserRouter>
        </AuthProvider>
      </AlertProvider>
    </ErrorBoundary>
  </StrictMode>,
);

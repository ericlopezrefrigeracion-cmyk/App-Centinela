import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import App from './App';
import { AlertProvider } from './componentes/AlertProvider';
import { AvisoVersion } from './componentes/AvisoVersion';
import { ErrorBoundary } from './componentes/ErrorBoundary';
import { TirarParaActualizar } from './componentes/TirarParaActualizar';
import { AuthProvider } from './contexto/AuthContext';
import { iniciarTema } from './lib/temaNavegador';
import './estilos.css';

// Tema elegido (Claro / Auto / Oscuro): ya lo puso public/tema-inicial.js; acá queda escuchando
iniciarTema();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AlertProvider>
        <AuthProvider>
          <BrowserRouter>
            <App />
            <AvisoVersion />
            {/* Tirar para actualizar (D6). El contenido se desplaza dentro de .desplazable (no el documento): el gesto del navegador no anda, va el propio en cualquier pantalla táctil. */}
            <TirarParaActualizar tambienEnNavegador />
          </BrowserRouter>
        </AuthProvider>
      </AlertProvider>
    </ErrorBoundary>
  </StrictMode>,
);

// Avisos y confirmaciones en un modal propio (antes reemplazaba a Alert.alert de React Native).
// showAlert(título, mensaje, botones) se puede llamar desde cualquier lado; el modal se monta una
// sola vez en la raíz de la app.
import { useEffect, useState, type ReactNode } from 'react';
import { Tocable } from './ui';

export interface AlertButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

interface AlertState {
  title: string;
  message?: string;
  buttons: AlertButton[];
}

let showAlertImpl: ((title: string, message?: string, buttons?: AlertButton[]) => void) | null = null;

export function showAlert(title: string, message?: string, buttons?: AlertButton[]) {
  if (showAlertImpl) {
    showAlertImpl(title, message, buttons);
  } else {
    // Respaldo: no debería pasar, el proveedor se monta antes que cualquier pantalla.
    window.alert(message ? `${title}\n\n${message}` : title);
    const btn = buttons?.find((b) => b.style !== 'cancel') ?? buttons?.[0];
    btn?.onPress?.();
  }
}

export function AlertProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AlertState | null>(null);

  useEffect(() => {
    showAlertImpl = (title, message, buttons) => {
      const normalizados = buttons && buttons.length > 0 ? buttons : [{ text: 'OK' }];
      setState({ title, message, buttons: normalizados });
    };
    return () => { showAlertImpl = null; };
  }, []);

  // Escape cierra el aviso, como el botón "atrás" del sistema
  useEffect(() => {
    if (!state) return;
    const tecla = (ev: KeyboardEvent) => { if (ev.key === 'Escape') setState(null); };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [state]);

  function handlePress(btn: AlertButton) {
    setState(null);
    btn.onPress?.();
  }

  return (
    <>
      {children}
      {state && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={state.title}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 24,
            animation: 'aparecer 0.3s',
          }}
        >
          <div style={{ backgroundColor: '#111823', borderRadius: 16, padding: 20, width: '100%', maxWidth: 360, borderWidth: 1, borderColor: '#1e2d3a' }}>
            {state.title ? <span style={{ color: '#ffffff', fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{state.title}</span> : null}
            {state.message ? <span style={{ color: '#8a9ab0', fontSize: 14, marginBottom: 20, lineHeight: '20px' }}>{state.message}</span> : null}
            <div style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 4 }}>
              {state.buttons.map((b, i) => (
                <Tocable key={i} onPress={() => handlePress(b)} estilo={{ paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8 }} opacidadActiva={0.75}>
                  <span style={{ color: b.style === 'destructive' ? '#ff4444' : b.style === 'cancel' ? '#8a9ab0' : '#7ed321', fontSize: 14, fontWeight: 600 }}>
                    {b.text}
                  </span>
                </Tocable>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

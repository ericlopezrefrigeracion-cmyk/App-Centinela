import { createContext, useContext, useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';

// `Alert.alert` de React Native es un NO-OP total en web -- react-native-web lo implementa
// como una función vacía (ver node_modules/react-native-web/src/exports/Alert/index.js:
// `static alert() {}`). Ningún diálogo se muestra y ningún callback de los botones se ejecuta
// jamás, así que cualquier acción que dependa de confirmar un Alert (cerrar sesión, marcar
// todas las alertas como vistas, etc.) queda completamente rota en web -- bug real reportado
// por el usuario.
//
// showAlert() tiene la MISMA firma que Alert.alert(title, message, buttons) para poder
// reemplazar todos los call sites existentes solo cambiando el import, pero se resuelve con
// un modal real (vía AlertProvider, montado una sola vez en app/_layout.tsx).

interface AlertButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}
interface AlertState {
  title: string;
  message?: string;
  buttons: AlertButton[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let showAlertImpl: ((title: string, message?: string, buttons?: AlertButton[]) => void) | null = null;

export function showAlert(title: string, message?: string, buttons?: AlertButton[]) {
  if (showAlertImpl) {
    showAlertImpl(title, message, buttons);
  } else if (typeof window !== 'undefined' && window.alert) {
    // Fallback defensivo -- no debería pasar nunca, AlertProvider se monta en el layout raíz
    // antes que cualquier pantalla pueda llamar a showAlert.
    window.alert(message ? `${title}\n\n${message}` : title);
    const btn = buttons?.find(b => b.style !== 'cancel') ?? buttons?.[0];
    btn?.onPress?.();
  }
}

const AlertContext = createContext<null>(null);

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AlertState | null>(null);

  useEffect(() => {
    showAlertImpl = (title, message, buttons) => {
      const normalized = buttons && buttons.length > 0 ? buttons : [{ text: 'OK' }];
      setState({ title, message, buttons: normalized });
    };
    return () => { showAlertImpl = null; };
  }, []);

  function handlePress(btn: AlertButton) {
    setState(null);
    btn.onPress?.();
  }

  return (
    <AlertContext.Provider value={null}>
      {children}
      <Modal visible={!!state} transparent animationType="fade" onRequestClose={() => setState(null)}>
        <View style={styles.overlay}>
          <View style={styles.card}>
            {state?.title ? <Text style={styles.title}>{state.title}</Text> : null}
            {state?.message ? <Text style={styles.message}>{state.message}</Text> : null}
            <View style={styles.actions}>
              {state?.buttons.map((b, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => handlePress(b)}
                  style={styles.btn}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.btnText, b.style === 'destructive' && styles.btnTextDestructive, b.style === 'cancel' && styles.btnTextCancel]}>
                    {b.text}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </AlertContext.Provider>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useAlertContext() { return useContext(AlertContext); }

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: { backgroundColor: '#111823', borderRadius: 16, padding: 20, width: '100%', maxWidth: 360, borderWidth: 1, borderColor: '#1e2d3a' },
  title: { color: '#ffffff', fontSize: 16, fontWeight: '700', marginBottom: 8 },
  message: { color: '#8a9ab0', fontSize: 14, marginBottom: 20, lineHeight: 20 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 4 },
  btn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8 },
  btnText: { color: '#7ed321', fontSize: 14, fontWeight: '600' },
  btnTextDestructive: { color: '#ff4444' },
  btnTextCancel: { color: '#8a9ab0' },
});

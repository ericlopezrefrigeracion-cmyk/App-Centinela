import { useEffect, useState } from 'react';
import { showAlert } from '../componentes/AlertProvider';
import { Desplazable, Spinner, Tocable } from '../componentes/ui';
import { useAuth } from '../contexto/AuthContext';
import { e, type Estilo } from '../lib/estilo';
import { authService } from '../lib/servicios';
import { C, FontSizes, FontWeights, Radius, Spacing } from '../lib/tema';

interface DatosPerfil {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  cuit: string;
}

function FilaDato({ label, valor }: { label: string; valor: string }) {
  return (
    <div style={e(s.filaDato)}>
      <span style={e(s.filaLabel)}>{label}</span>
      <span style={e(s.filaValor)}>{valor || '—'}</span>
    </div>
  );
}

function abrir(url: string) {
  window.open(url, '_blank', 'noopener');
}

export default function Perfil() {
  const { logout } = useAuth();
  const [usuario, setUsuario] = useState<DatosPerfil | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await authService.getPerfil();
        setUsuario({
          nombre: data.nombre,
          apellido: data.apellido,
          email: data.mail,
          telefono: data.telefono ?? '',
          cuit: data.cuit ?? '',
        });
      } catch (err) {
        console.log('Error cargando perfil:', err);
      } finally {
        setCargando(false);
      }
    })();
  }, []);

  function handleLogout() {
    showAlert('Cerrar sesión', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', style: 'destructive', onPress: () => logout() },
    ]);
  }

  if (cargando) {
    return (
      <div style={e(s.centrado)}>
        <Spinner tamano="large" color={C.primary} />
      </div>
    );
  }

  return (
    <Desplazable estilo={s.container} estiloContenido={s.scroll}>
      <div style={e(s.header)}>
        <div style={e(s.avatar)}>
          <span style={e(s.avatarText)}>{(usuario?.nombre?.[0] ?? '') + (usuario?.apellido?.[0] ?? '')}</span>
        </div>
        <span style={e(s.nombre)}>{usuario?.nombre} {usuario?.apellido}</span>
        <span style={e(s.email)}>{usuario?.email}</span>
      </div>

      <div style={e(s.seccion)}>
        <span style={e(s.seccionTitulo)}>Datos personales</span>
        <FilaDato label="Nombre" valor={`${usuario?.nombre ?? ''} ${usuario?.apellido ?? ''}`} />
        <FilaDato label="Email" valor={usuario?.email ?? ''} />
        <FilaDato label="Teléfono" valor={usuario?.telefono ?? ''} />
        <FilaDato label="CUIT" valor={usuario?.cuit ?? ''} />
      </div>

      <div style={e(s.seccion)}>
        <span style={e(s.seccionTitulo)}>Soporte</span>
        <Tocable estilo={s.linkRow} onPress={() => abrir('https://wa.me/543385470666')}>
          <span style={e(s.linkText)}>💬  WhatsApp Telemet</span>
        </Tocable>
        <Tocable estilo={s.linkRow} onPress={() => abrir('https://telemet.netlify.app')}>
          <span style={e(s.linkText)}>🌐  telemet.netlify.app</span>
        </Tocable>
      </div>

      <Tocable estilo={s.btnLogout} onPress={handleLogout}>
        <span style={e(s.btnLogoutText)}>Cerrar sesión</span>
      </Tocable>

      <span style={e(s.version)}>Centinela v1.0 · Telemet © 2026</span>
    </Desplazable>
  );
}

const s: Record<string, Estilo> = {
  container: { flex: 1, backgroundColor: C.background },
  scroll: { padding: Spacing.lg, paddingBottom: 40, maxWidth: 600, width: '100%', alignSelf: 'center' },
  centrado: { flex: 1, backgroundColor: C.background, justifyContent: 'center', alignItems: 'center' },

  header: { alignItems: 'center', marginBottom: Spacing.xl },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: C.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { fontSize: 26, fontWeight: 800, color: C.black },
  nombre: { fontSize: FontSizes.xl, fontWeight: FontWeights.bold, color: C.text, marginBottom: 4 },
  email: { fontSize: FontSizes.sm, color: C.textSub },

  seccion: { backgroundColor: C.card, borderRadius: Radius.lg, borderWidth: 1, borderColor: C.border, padding: Spacing.md, marginBottom: Spacing.lg },
  seccionTitulo: { fontSize: FontSizes.xs, textTransform: 'uppercase', letterSpacing: 0.8, color: C.textMuted, fontWeight: FontWeights.bold, marginBottom: Spacing.sm },

  filaDato: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  filaLabel: { fontSize: FontSizes.sm, color: C.textSub },
  filaValor: { fontSize: FontSizes.sm, color: C.text, fontWeight: FontWeights.medium },

  linkRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  linkText: { fontSize: FontSizes.sm, color: C.primary },

  btnLogout: { backgroundColor: 'rgba(255,68,68,0.1)', borderRadius: Radius.lg, padding: Spacing.md, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,68,68,0.2)', marginBottom: Spacing.lg },
  btnLogoutText: { color: C.critico, fontWeight: FontWeights.bold, fontSize: FontSizes.md },

  version: { textAlign: 'center', color: C.textMuted, fontSize: FontSizes.xs },
};

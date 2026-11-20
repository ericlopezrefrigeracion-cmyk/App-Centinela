import { useEffect, useState } from 'react';
import { showAlert } from '../componentes/AlertProvider';
import { Icono } from '../componentes/iconos';
import { TituloPestana } from '../componentes/navegacion';
import { SelectorTema } from '../componentes/SelectorTema';
import { Boton, Desplazable, Spinner, Tocable, tarjeta } from '../componentes/ui';
import { useAuth } from '../contexto/AuthContext';
import { e, type Estilo } from '../lib/estilo';
import { authService } from '../lib/servicios';
import { C, FontSizes, FontWeights, Spacing } from '../lib/tema';

interface DatosPerfil {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  cuit: string;
}

function FilaDato({ label, valor, ultima }: { label: string; valor: string; ultima?: boolean }) {
  return (
    <div style={e(s.filaDato, ultima && { borderBottomWidth: 0 })}>
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
        <Spinner tamano="large" />
      </div>
    );
  }

  return (
    <div style={e(s.container)}>
      <TituloPestana titulo="Perfil" anchoMaximo={600} />
      <Desplazable estiloContenido={s.scroll}>
        <div style={e(s.header)}>
          <div style={e(s.avatar)}>
            <span style={e(s.avatarText)}>{(usuario?.nombre?.[0] ?? '') + (usuario?.apellido?.[0] ?? '')}</span>
          </div>
          <div style={e(s.headerTextos)}>
            <span style={e(s.nombre)}>{usuario?.nombre} {usuario?.apellido}</span>
            <span style={e(s.email)}>{usuario?.email}</span>
          </div>
        </div>

        <span style={e(s.seccionTitulo)}>Datos personales</span>
        <div style={e(s.seccion)}>
          <FilaDato label="Nombre" valor={`${usuario?.nombre ?? ''} ${usuario?.apellido ?? ''}`} />
          <FilaDato label="Email" valor={usuario?.email ?? ''} />
          <FilaDato label="Teléfono" valor={usuario?.telefono ?? ''} />
          <FilaDato label="CUIT" valor={usuario?.cuit ?? ''} ultima />
        </div>

        <span style={e(s.seccionTitulo)}>Tema</span>
        <div style={e(s.seccion, s.seccionTema)}>
          <SelectorTema />
          <span style={e(s.notaTema)}>Auto sigue el modo del teléfono o la computadora. Se guarda en este dispositivo.</span>
        </div>

        <span style={e(s.seccionTitulo)}>Soporte</span>
        <div style={e(s.seccion)}>
          <Tocable estilo={s.linkRow} onPress={() => abrir('https://wa.me/543385470666')} opacidadActiva={0.6}>
            <Icono nombre="mensaje" tamano={18} color={C.verde} />
            <span style={e(s.linkText)}>WhatsApp Telemet</span>
            <Icono nombre="siguiente" tamano={18} color={C.textSub} />
          </Tocable>
          <Tocable estilo={[s.linkRow, { borderBottomWidth: 0 }]} onPress={() => abrir('https://telemet.netlify.app')} opacidadActiva={0.6}>
            <Icono nombre="globo" tamano={18} color={C.verde} />
            <span style={e(s.linkText)}>telemet.netlify.app</span>
            <Icono nombre="siguiente" tamano={18} color={C.textSub} />
          </Tocable>
        </div>

        <Boton variante="peligro" icono="salir" onPress={handleLogout} estilo={{ marginTop: Spacing.sm, marginBottom: Spacing.lg }}>Cerrar sesión</Boton>

        <span style={e(s.version)}>Centinela v1.0 · Telemet © 2026</span>
      </Desplazable>
    </div>
  );
}

const s: Record<string, Estilo> = {
  container: { flex: 1, backgroundColor: C.background },
  scroll: { paddingHorizontal: Spacing.md, paddingBottom: 40, maxWidth: 600, width: '100%', alignSelf: 'center' },
  centrado: { flex: 1, backgroundColor: C.background, justifyContent: 'center', alignItems: 'center' },

  header: { ...tarjeta, flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md, marginBottom: Spacing.lg },
  headerTextos: { flex: 1, minWidth: 0, gap: 2 },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: C.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 20, fontWeight: FontWeights.bold, color: C.sobrePrimary },
  nombre: { fontSize: FontSizes.lg, fontWeight: FontWeights.semibold, color: C.text },
  email: { fontSize: FontSizes.sm, color: C.textSub, overflow: 'hidden', textOverflow: 'ellipsis' },

  seccion: { ...tarjeta, paddingHorizontal: Spacing.md, marginBottom: Spacing.lg },
  seccionTitulo: { fontSize: FontSizes.sm, color: C.textSub, fontWeight: FontWeights.semibold, marginBottom: Spacing.sm, paddingHorizontal: 4 },

  filaDato: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, minHeight: 48, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: C.border },
  filaLabel: { fontSize: FontSizes.sm, color: C.textSub },
  filaValor: { fontSize: FontSizes.sm, color: C.text, fontWeight: FontWeights.medium, textAlign: 'right' },

  seccionTema: { paddingVertical: Spacing.md, gap: Spacing.sm },
  notaTema: { fontSize: FontSizes.xs, color: C.textSub },

  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, borderBottomWidth: 1, borderBottomColor: C.border },
  linkText: { fontSize: FontSizes.md, color: C.text, flex: 1 },

  version: { textAlign: 'center', color: C.textSub, fontSize: FontSizes.xs },
};

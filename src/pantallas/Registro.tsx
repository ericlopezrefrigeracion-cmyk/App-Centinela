import { useState } from 'react';
import { useNavigate } from 'react-router';
import { showAlert } from '../componentes/AlertProvider';
import { volver } from '../componentes/navegacion';
import { Campo, Desplazable, Spinner, Tocable } from '../componentes/ui';
import { useAuth } from '../contexto/AuthContext';
import { e, type Estilo } from '../lib/estilo';
import { C } from '../lib/tema';
import { validarRegistro } from '../lib/validaciones';

type Clave = 'nombre' | 'apellido' | 'mail' | 'password' | 'confirmar' | 'telefono';

export default function Registro() {
  const { registro } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<Record<Clave, string>>({ nombre: '', apellido: '', mail: '', password: '', confirmar: '', telefono: '' });
  const [cargando, setCargando] = useState(false);
  const set = (k: Clave, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function handleRegistro() {
    const aviso = validarRegistro(form);
    if (aviso) {
      showAlert(aviso.titulo, aviso.mensaje);
      return;
    }
    setCargando(true);
    const mail = form.mail.trim().toLowerCase();
    const res = await registro({
      mail,
      nombre: form.nombre.trim(),
      apellido: form.apellido.trim(),
      password: form.password,
      telefono: form.telefono.trim() || undefined,
    });
    setCargando(false);
    if (res.ok) {
      navigate(`/verificar-email?mail=${encodeURIComponent(mail)}`);
    } else {
      showAlert('Error al registrarse', res.mensaje);
    }
  }

  return (
    <Desplazable estilo={s.scroll} estiloContenido={s.container}>
      <span style={e(s.logo)}>tele<span style={{ color: '#7ed321' }}>met</span></span>
      <span style={e(s.title)}>Crear cuenta</span>
      <span style={e(s.sub)}>Completá tus datos para empezar</span>

      <div style={e(s.row)}>
        <div style={e(s.field, { flex: 1, marginRight: 8 })}>
          <span style={e(s.label)}>Nombre *</span>
          <Campo estilo={s.input} colorPlaceholder={C.text} valor={form.nombre} onCambio={(v) => set('nombre', v)} placeholder="Juan" autoCapitalize="words" />
        </div>
        <div style={e(s.field, { flex: 1 })}>
          <span style={e(s.label)}>Apellido *</span>
          <Campo estilo={s.input} colorPlaceholder={C.text} valor={form.apellido} onCambio={(v) => set('apellido', v)} placeholder="Pérez" autoCapitalize="words" />
        </div>
      </div>

      <div style={e(s.field)}>
        <span style={e(s.label)}>Email *</span>
        <Campo estilo={s.input} colorPlaceholder={C.text} valor={form.mail} onCambio={(v) => set('mail', v)} placeholder="tu@email.com" tipo="email" autoCapitalize="none" />
      </div>

      <div style={e(s.field)}>
        <span style={e(s.label)}>Teléfono</span>
        <Campo estilo={s.input} colorPlaceholder={C.text} valor={form.telefono} onCambio={(v) => set('telefono', v)} placeholder="+54 9 ..." tipo="tel" />
      </div>

      <div style={e(s.field)}>
        <span style={e(s.label)}>Contraseña *</span>
        <Campo estilo={s.input} colorPlaceholder={C.text} valor={form.password} onCambio={(v) => set('password', v)} placeholder="Mínimo 6 caracteres" tipo="password" autoComplete="new-password" />
      </div>

      <div style={e(s.field)}>
        <span style={e(s.label)}>Confirmar contraseña *</span>
        <Campo estilo={s.input} colorPlaceholder={C.text} valor={form.confirmar} onCambio={(v) => set('confirmar', v)} placeholder="Repetí la contraseña" tipo="password" autoComplete="new-password" />
      </div>

      <Tocable estilo={s.btn} onPress={handleRegistro} disabled={cargando}>
        {cargando ? <Spinner color="#080c10" /> : <span style={e(s.btnText)}>Crear cuenta</span>}
      </Tocable>

      <Tocable onPress={() => volver(navigate, '/login')} estilo={s.link}>
        <span style={e(s.linkText)}>Ya tengo cuenta — Iniciar sesión</span>
      </Tocable>
    </Desplazable>
  );
}

const s: Record<string, Estilo> = {
  scroll: { flex: 1 },
  container: { padding: 28, paddingTop: 60, paddingBottom: 40, maxWidth: 440, width: '100%', alignSelf: 'center' },
  logo: { fontSize: 28, fontWeight: 800, color: C.text, marginBottom: 24 },
  title: { fontSize: 24, fontWeight: 800, color: C.text, marginBottom: 6 },
  sub: { fontSize: 14, color: '#a0afbe', marginBottom: 28 },
  row: { flexDirection: 'row' },
  field: { marginBottom: 16 },
  label: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8, color: '#a0afbe', marginBottom: 6, fontWeight: 600 },
  input: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 14, fontSize: 15, color: C.text },
  btn: { backgroundColor: '#7ed321', borderRadius: 12, padding: 18, alignItems: 'center', marginTop: 24, marginBottom: 8 },
  btnText: { color: '#080c10', fontWeight: 800, fontSize: 17 },
  link: { marginTop: 20, alignItems: 'center' },
  // Antes este enlace quedaba negro sobre negro (color sin definir): ahora es verde como los demás
  linkText: { color: C.primary, fontSize: 14 },
};

import { useState } from 'react';
import { useNavigate } from 'react-router';
import { showAlert } from '../componentes/AlertProvider';
import { volver } from '../componentes/navegacion';
import { Boton, Campo, campoTexto, Desplazable, Tocable } from '../componentes/ui';
import { useAuth } from '../contexto/AuthContext';
import { e, type Estilo } from '../lib/estilo';
import { C, FontSizes, FontWeights, Spacing, TOQUE } from '../lib/tema';
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
      <span style={e(s.logo)}>tele<span style={{ color: C.logoMet }}>met</span></span>
      <span style={e(s.title)}>Crear cuenta</span>
      <span style={e(s.sub)}>Completá tus datos para empezar</span>

      <div style={e(s.row)}>
        <div style={e(s.field, { flex: 1, marginRight: 8 })}>
          <span style={e(s.label)}>Nombre *</span>
          <Campo estilo={s.input} valor={form.nombre} onCambio={(v) => set('nombre', v)} placeholder="Juan" autoCapitalize="words" />
        </div>
        <div style={e(s.field, { flex: 1 })}>
          <span style={e(s.label)}>Apellido *</span>
          <Campo estilo={s.input} valor={form.apellido} onCambio={(v) => set('apellido', v)} placeholder="Pérez" autoCapitalize="words" />
        </div>
      </div>

      <div style={e(s.field)}>
        <span style={e(s.label)}>Email *</span>
        <Campo estilo={s.input} valor={form.mail} onCambio={(v) => set('mail', v)} placeholder="tu@email.com" tipo="email" autoCapitalize="none" />
      </div>

      <div style={e(s.field)}>
        <span style={e(s.label)}>Teléfono</span>
        <Campo estilo={s.input} valor={form.telefono} onCambio={(v) => set('telefono', v)} placeholder="+54 9 ..." tipo="tel" />
      </div>

      <div style={e(s.field)}>
        <span style={e(s.label)}>Contraseña *</span>
        <Campo estilo={s.input} valor={form.password} onCambio={(v) => set('password', v)} placeholder="Mínimo 6 caracteres" tipo="password" autoComplete="new-password" />
      </div>

      <div style={e(s.field)}>
        <span style={e(s.label)}>Confirmar contraseña *</span>
        <Campo estilo={s.input} valor={form.confirmar} onCambio={(v) => set('confirmar', v)} placeholder="Repetí la contraseña" tipo="password" autoComplete="new-password" />
      </div>

      <Boton onPress={handleRegistro} cargando={cargando} estilo={s.btn}>Crear cuenta</Boton>

      <Tocable onPress={() => volver(navigate, '/login')} estilo={s.link}>
        <span style={e(s.linkText)}>Ya tengo cuenta — Iniciar sesión</span>
      </Tocable>
    </Desplazable>
  );
}

const s: Record<string, Estilo> = {
  scroll: { flex: 1 },
  container: { padding: Spacing.md, paddingTop: Spacing.sm, paddingBottom: 40, maxWidth: 440, width: '100%', alignSelf: 'center' },
  logo: { fontSize: 28, fontWeight: FontWeights.bold, color: C.text, letterSpacing: -0.5, marginBottom: 20 },
  title: { fontSize: 24, fontWeight: FontWeights.bold, color: C.text, marginBottom: 6 },
  sub: { fontSize: 14, color: C.textSub, marginBottom: 24 },
  row: { flexDirection: 'row' },
  field: { marginBottom: 16 },
  label: { fontSize: FontSizes.sm, color: C.text, marginBottom: 6, fontWeight: FontWeights.medium },
  input: { ...campoTexto },
  btn: { marginTop: 8 },
  link: { marginTop: 12, minHeight: TOQUE, alignItems: 'center', justifyContent: 'center' },
  // Antes este enlace quedaba negro sobre negro (color sin definir): ahora es verde como los demás
  linkText: { color: C.verde, fontSize: 14, fontWeight: FontWeights.medium },
};

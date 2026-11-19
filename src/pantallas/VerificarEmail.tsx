import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { showAlert } from '../componentes/AlertProvider';
import { Boton, Campo, campoTexto, Tocable } from '../componentes/ui';
import { useAuth } from '../contexto/AuthContext';
import { e, type Estilo } from '../lib/estilo';
import { C, FontSizes, FontWeights, Spacing, TOQUE } from '../lib/tema';

export default function VerificarEmail() {
  const { verificarEmail, reenviarVerificacion } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const mail = params.get('mail') ?? '';
  const [codigo, setCodigo] = useState('');
  const [cargando, setCargando] = useState(false);
  const [reenviando, setReenviando] = useState(false);

  async function handleVerificar() {
    if (codigo.length < 4) {
      showAlert('Error', 'Ingresá el código que recibiste por email.');
      return;
    }
    setCargando(true);
    const res = await verificarEmail(mail, codigo.trim());
    if (res.ok) {
      showAlert('Email verificado', 'Tu cuenta está activa. Iniciá sesión.');
      navigate('/login', { replace: true });
    } else {
      showAlert('Código incorrecto', res.mensaje);
    }
    setCargando(false);
  }

  async function handleReenviar() {
    setReenviando(true);
    await reenviarVerificacion(mail);
    setReenviando(false);
    showAlert('Código reenviado', 'Revisá tu email.');
  }

  return (
    <div style={e(s.container)}>
      <span style={e(s.logo)}>tele<span style={{ color: C.logoMet }}>met</span></span>
      <span style={e(s.title)}>Verificá tu email</span>
      <span style={e(s.sub)}>Te enviamos un código a{'\n'}<span style={{ color: C.text, fontWeight: FontWeights.semibold }}>{mail}</span></span>

      <div style={e(s.field)}>
        <span style={e(s.label)}>Código de verificación</span>
        <Campo
          estilo={[s.input, s.inputCodigo]}
          valor={codigo}
          onCambio={setCodigo}
          placeholder="Ej: 123456"
         
          inputMode="numeric"
          maxLength={8}
          autoFocus
        />
      </div>

      <Boton onPress={handleVerificar} cargando={cargando}>Verificar cuenta</Boton>

      <Tocable estilo={s.link} onPress={handleReenviar} disabled={reenviando}>
        <span style={e(s.linkText)}>{reenviando ? 'Reenviando...' : '¿No recibiste el código? Reenviar'}</span>
      </Tocable>

      <Tocable estilo={s.link} onPress={() => navigate('/login', { replace: true })}>
        <span style={e(s.linkText)}>Volver al inicio de sesión</span>
      </Tocable>
    </div>
  );
}

const s: Record<string, Estilo> = {
  container: { flex: 1, backgroundColor: C.background, padding: Spacing.md, paddingTop: Spacing.sm, maxWidth: 440, width: '100%', alignSelf: 'center' },
  logo: { fontSize: 28, fontWeight: FontWeights.bold, color: C.text, letterSpacing: -0.5, marginBottom: 24 },
  title: { fontSize: 24, fontWeight: FontWeights.bold, color: C.text, marginBottom: 10 },
  sub: { fontSize: 15, color: C.textSub, marginBottom: 28, lineHeight: 22 },
  field: { marginBottom: 20 },
  label: { fontSize: FontSizes.sm, color: C.text, marginBottom: 8, fontWeight: FontWeights.medium },
  input: { ...campoTexto },
  inputCodigo: { fontSize: 28, fontWeight: FontWeights.bold, textAlign: 'center', letterSpacing: 8, minHeight: 64 },
  link: { marginTop: 8, minHeight: TOQUE, alignItems: 'center', justifyContent: 'center' },
  linkText: { color: C.verde, fontSize: 14, fontWeight: FontWeights.medium },
};

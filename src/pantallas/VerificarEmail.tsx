import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { showAlert } from '../componentes/AlertProvider';
import { Campo, Spinner, Tocable } from '../componentes/ui';
import { useAuth } from '../contexto/AuthContext';
import { e, type Estilo } from '../lib/estilo';

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
      <span style={e(s.logo)}>tele<span>met</span></span>
      <span style={e(s.title)}>Verificá tu email</span>
      <span style={e(s.sub)}>Te enviamos un código a{'\n'}<span>{mail}</span></span>

      <div style={e(s.field)}>
        <span style={e(s.label)}>Código de verificación</span>
        <Campo
          estilo={[s.input, s.inputCodigo]}
          valor={codigo}
          onCambio={setCodigo}
          placeholder="Ej: 123456"
          colorPlaceholder="#f0f4ff"
          inputMode="numeric"
          maxLength={8}
          autoFocus
        />
      </div>

      <Tocable estilo={s.btn} onPress={handleVerificar} disabled={cargando}>
        {cargando ? <Spinner color="#080c10" /> : <span style={e(s.btnText)}>Verificar cuenta</span>}
      </Tocable>

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
  container: { flex: 1, backgroundColor: '#080c10', padding: 28, paddingTop: 80, maxWidth: 440, width: '100%', alignSelf: 'center' },
  logo: { fontSize: 28, fontWeight: 800, color: '#f0f4ff', marginBottom: 32 },
  title: { fontSize: 24, fontWeight: 800, color: '#f0f4ff', marginBottom: 10 },
  sub: { fontSize: 15, color: '#a0afbe', marginBottom: 36, lineHeight: 22 },
  field: { marginBottom: 24 },
  label: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8, color: '#a0afbe', marginBottom: 8, fontWeight: 600 },
  input: { backgroundColor: '#0d1219', borderWidth: 1, borderColor: '#1a2332', borderRadius: 10, padding: 14, fontSize: 15, color: '#f0f4ff' },
  inputCodigo: { fontSize: 28, fontWeight: 700, textAlign: 'center', letterSpacing: 8, color: '#f0f4ff' },
  btn: { backgroundColor: '#7ed321', borderRadius: 12, padding: 18, alignItems: 'center', marginTop: 8, marginBottom: 8 },
  btnText: { color: '#080c10', fontWeight: 800, fontSize: 17 },
  link: { marginTop: 16, alignItems: 'center' },
  linkText: { color: '#7ed321', fontSize: 14 },
};

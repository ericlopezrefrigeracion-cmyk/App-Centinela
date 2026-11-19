import { useState } from 'react';
import { useNavigate } from 'react-router';
import { showAlert } from '../componentes/AlertProvider';
import { Icono } from '../componentes/iconos';
import { Boton, Campo, campoTexto, Desplazable, Tocable, tarjeta } from '../componentes/ui';
import { useAuth } from '../contexto/AuthContext';
import { e, type Estilo } from '../lib/estilo';
import { authService } from '../lib/servicios';
import { C, FontSizes, FontWeights, Radius, Spacing, TOQUE } from '../lib/tema';
import { validarLogin } from '../lib/validaciones';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  const [verPass, setVerPass] = useState(false);
  const [errores, setErrores] = useState<{ email?: string; password?: string }>({});

  async function handleLogin() {
    const nuevos = validarLogin(email, password);
    setErrores(nuevos);
    if (Object.keys(nuevos).length > 0) return;

    setCargando(true);
    const resultado = await login(email.trim().toLowerCase(), password);
    setCargando(false);

    if (!resultado.ok) showAlert('Error al iniciar sesión', resultado.mensaje);
    // Si sale bien, la app pasa sola a la pantalla de equipos
  }

  async function handleRecuperar() {
    if (!email.trim()) {
      showAlert('Ingresá tu email', 'Escribí tu email en el campo de arriba antes de recuperar la contraseña.');
      return;
    }
    try {
      await authService.recuperarPassword(email.trim().toLowerCase());
      showAlert('Email enviado', 'Revisá tu bandeja de entrada para recuperar la contraseña.');
    } catch {
      showAlert('Error', 'No se pudo enviar el email. Verificá la dirección ingresada.');
    }
  }

  return (
    <div style={e(s.container)}>
      <form
        style={{ display: 'contents' }}
        onSubmit={(ev) => { ev.preventDefault(); void handleLogin(); }}
      >
        <Desplazable estiloContenido={s.scroll}>
          {/* Logo */}
          <div style={e(s.logoSection)}>
            {/* Arcos decorativos */}
            <div style={e(s.arcosContainer)}>
              {[80, 60, 40].map((size, i) => (
                <div
                  key={i}
                  style={e(s.arco, {
                    width: size,
                    height: size / 2,
                    borderColor: C.verdePunto,
                    opacity: 0.3 + i * 0.25,
                    borderTopLeftRadius: size / 2,
                    borderTopRightRadius: size / 2,
                    bottom: 0,
                  })}
                />
              ))}
              <div style={e(s.arcoCentro)} />
            </div>

            <div style={e(s.logoRow)}>
              <span style={e(s.logoTele)}>tele</span>
              <span style={e(s.logoMet)}>met</span>
            </div>
            <span style={e(s.logoSub)}>Centinela</span>
            <span style={e(s.logoTagline)}>Monitoreo de temperatura 24/7</span>
          </div>

          {/* Formulario */}
          <div style={e(s.form)}>
            <span style={e(s.formTitulo)}>Iniciar sesión</span>

            <div style={e(s.campo)}>
              <span style={e(s.campoLabel)}>Email</span>
              <Campo
                estilo={[s.input, !!errores.email && s.inputError]}
                placeholder="tu@email.com"
                valor={email}
                onCambio={(t) => { setEmail(t); setErrores((er) => ({ ...er, email: undefined })); }}
                tipo="email"
                autoCapitalize="none"
                autoComplete="email"
              />
              {errores.email && <span style={e(s.errorText)}>{errores.email}</span>}
            </div>

            <div style={e(s.campo)}>
              <span style={e(s.campoLabel)}>Contraseña</span>
              <div style={e(s.passRow)}>
                <Campo
                  estilo={[s.input, s.passInput, !!errores.password && s.inputError]}
                  placeholder="••••••••"
                  valor={password}
                  onCambio={(t) => { setPassword(t); setErrores((er) => ({ ...er, password: undefined })); }}
                  tipo={verPass ? 'text' : 'password'}
                  autoComplete="current-password"
                />
                <Tocable
                  estilo={[s.eyeBtn, !!errores.password && s.inputError]}
                  onPress={() => setVerPass((v) => !v)}
                  opacidadActiva={0.75}
                  etiqueta={verPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  <Icono nombre={verPass ? 'ojoTachado' : 'ojo'} tamano={20} />
                </Tocable>
              </div>
              {errores.password && <span style={e(s.errorText)}>{errores.password}</span>}
            </div>

            <Tocable estilo={s.recuperarBtn} onPress={handleRecuperar} opacidadActiva={0.75}>
              <span style={e(s.recuperarText)}>¿Olvidaste tu contraseña?</span>
            </Tocable>

            <Boton onPress={handleLogin} cargando={cargando}>Ingresar →</Boton>
            {/* Enter en los campos envía el formulario */}
            <button type="submit" hidden />
          </div>

          <Tocable onPress={() => navigate('/registro')} estilo={s.enlace}>
            <span style={e(s.enlaceText)}>¿No tenés cuenta? Registrate</span>
          </Tocable>

          <span style={e(s.footer)}>Centinela © 2026 · Telemet</span>
        </Desplazable>
      </form>
    </div>
  );
}

const s: Record<string, Estilo> = {
  container: { flex: 1, backgroundColor: C.background },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: Spacing.lg, paddingHorizontal: Spacing.md, maxWidth: 440, width: '100%', alignSelf: 'center' },

  logoSection: { alignItems: 'center', marginBottom: Spacing.xl },
  arcosContainer: { width: 90, height: 50, alignItems: 'center', marginBottom: Spacing.md },
  arco: { position: 'absolute', borderWidth: 2, borderBottomWidth: 0, borderStyle: 'solid' },
  arcoCentro: { position: 'absolute', bottom: 0, width: 10, height: 10, borderRadius: 5, backgroundColor: C.verdePunto },
  logoRow: { flexDirection: 'row', marginBottom: 2 },
  logoTele: { color: C.text, fontSize: FontSizes.xxxl, fontWeight: FontWeights.bold, letterSpacing: -0.5 },
  logoMet: { color: C.logoMet, fontSize: FontSizes.xxxl, fontWeight: FontWeights.bold, letterSpacing: -0.5 },
  logoSub: { color: C.textSub, fontSize: FontSizes.md, fontWeight: FontWeights.medium, marginBottom: 4 },
  logoTagline: { color: C.textSub, fontSize: FontSizes.sm },

  form: { ...tarjeta, padding: 20, marginBottom: Spacing.md },
  formTitulo: { color: C.text, fontSize: FontSizes.xl, fontWeight: FontWeights.bold, marginBottom: 20 },

  campo: { marginBottom: Spacing.md },
  campoLabel: { color: C.text, fontSize: FontSizes.sm, fontWeight: FontWeights.medium, marginBottom: 6 },
  input: { ...campoTexto },
  inputError: { borderColor: C.rojo },
  passRow: { flexDirection: 'row' },
  passInput: { flex: 1, borderTopRightRadius: 0, borderBottomRightRadius: 0 },
  eyeBtn: {
    backgroundColor: C.campo, borderWidth: 1, borderLeftWidth: 0, borderColor: C.borderControl, color: C.textSub,
    borderTopRightRadius: Radius.md, borderBottomRightRadius: Radius.md, width: 48, alignItems: 'center', justifyContent: 'center',
  },
  errorText: { color: C.rojo, fontSize: FontSizes.xs, marginTop: Spacing.xs },

  recuperarBtn: { alignSelf: 'flex-end', minHeight: TOQUE, justifyContent: 'center', marginTop: -8, marginBottom: Spacing.sm },
  recuperarText: { color: C.verde, fontSize: FontSizes.sm, fontWeight: FontWeights.medium },

  enlace: { minHeight: TOQUE, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm },
  enlaceText: { color: C.verde, fontSize: 14, fontWeight: FontWeights.medium },

  footer: { textAlign: 'center', color: C.textSub, fontSize: FontSizes.xs },
};

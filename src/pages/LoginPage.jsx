import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { authAPI } from '../services/api';
import { Shield, AlertCircle, Mail, Lock, User, CreditCard, Sun, Moon, ArrowLeft } from 'lucide-react';

const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const isEmailValid = (email) => {
  return email.length > 0 && email.length <= 100 && emailRegex.test(email);
};

const isCedulaValid = (cedula) => {
  return /^[0-9]{10,15}$/.test(cedula);
};

const isPasswordValid = (password) => {
  if (password.length < 6 || password.length > 12) return false;
  return /[0-9!@#$%^&*]/.test(password);
};

const isNameValid = (name) => {
  return name.trim().length > 0 && name.length <= 100;
};

export default function LoginPage({ onBack, initialView, initialToken }) {
  const { login, register } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [view, setView] = useState(initialView || 'login');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState({
    identifier: '', password: '', name: '', email: '', cedula: '',
    token: initialToken || '', newPassword: ''
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
    setSuccess('');
  };

  const handleCedulaKeyPress = (e) => {
    // Permite únicamente caracteres numéricos [0-9]
    if (!/[0-9]/.test(e.key)) {
      e.preventDefault();
    }
  };

  const hashPassword = async (pwd) => {
    const msgBuffer = new TextEncoder().encode(pwd);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitted(true);
    setLoading(true);
    try {
      if (view === 'register') {
        const hashedPassword = await hashPassword(form.password);
        await register({ name: form.name, email: form.email, cedula: form.cedula, password: hashedPassword });
      } else if (view === 'login') {
        const hashedPassword = await hashPassword(form.password);
        await login(form.identifier, hashedPassword);
      } else if (view === 'forgot') {
        await authAPI.forgotPassword(form.email);
        setSuccess('Se ha enviado un correo electrónico con las instrucciones para restablecer la contraseña.');
        setTimeout(() => { setView('login'); setSubmitted(false); }, 3000);
      } else if (view === 'reset') {
        const hashedNewPassword = await hashPassword(form.newPassword);
        await authAPI.resetPassword(form.token, hashedNewPassword);
        setSuccess('Contraseña actualizada correctamente. Iniciando sesión...');
        setTimeout(() => setView('login'), 2000);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  // Validaciones de activación del botón de submit
  const isRegisterFormValid = isNameValid(form.name) && isEmailValid(form.email) && isCedulaValid(form.cedula) && isPasswordValid(form.password);
  const isLoginFormValid = form.identifier.trim().length > 0 && form.identifier.length <= 100 && form.password.length >= 6 && form.password.length <= 12;
  const isForgotFormValid = isEmailValid(form.email);
  const isResetFormValid = isPasswordValid(form.newPassword);

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          {onBack && (
            <button className="btn btn-ghost btn-sm" onClick={onBack}>
              <ArrowLeft size={14} /> Volver
            </button>
          )}
          <div style={{ marginLeft: 'auto' }}>
            <button className="theme-toggle" onClick={toggleTheme}>
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </div>

        <div className="auth-logo"><Shield size={32} /></div>
        <h1>
          {view === 'register' ? 'Crear Cuenta' :
            view === 'forgot' ? 'Recuperar Contraseña' :
              view === 'reset' ? 'Nueva Contraseña' : 'Iniciar Sesión'}
        </h1>
        <p className="auth-subtitle">
          {view === 'register' ? 'Únete a la red de seguridad ciudadana' :
            view === 'forgot' ? 'Ingresa tu correo para restablecer la contraseña' :
              view === 'reset' ? 'Ingresa tu nueva contraseña' :
                'Plataforma de seguridad ciudadana'}
        </p>

        {error && <div className="form-error"><AlertCircle size={16} />{error}</div>}
        {success && <div className="form-error" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}><Shield size={16} />{success}</div>}

        <form onSubmit={handleSubmit}>
          {view === 'register' && (
            <>
              <div className="form-group">
                <label>Nombre completo</label>
                <div style={{ position: 'relative' }}>
                  <User size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input type="text" name="name" className="form-input" style={{ paddingLeft: '2.25rem', width: '100%' }} placeholder="Tu nombre" value={form.name} onChange={handleChange} maxLength={100} required />
                </div>
              </div>
              <div className="form-group">
                <label>Email</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input type="email" name="email" className="form-input" style={{ paddingLeft: '2.25rem', width: '100%' }} placeholder="correo@ejemplo.com" value={form.email} onChange={handleChange} maxLength={100} required />
                </div>
              </div>
              <div className="form-group">
                <label>Cédula</label>
                <div style={{ position: 'relative' }}>
                  <CreditCard size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input type="text" name="cedula" className="form-input" style={{ paddingLeft: '2.25rem', width: '100%' }} placeholder="Número de cédula" value={form.cedula} onChange={handleChange} onKeyPress={handleCedulaKeyPress} maxLength={15} required />
                </div>
              </div>
            </>
          )}

          {view === 'login' && (
            <div className="form-group">
              <label>Email o Cédula</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input type="text" name="identifier" className="form-input" style={{ paddingLeft: '2.25rem', width: '100%' }} placeholder="correo@ejemplo.com o cédula" value={form.identifier} onChange={handleChange} maxLength={100} required />
              </div>
            </div>
          )}

          {view === 'forgot' && (
            <div className="form-group">
              <label>Email registrado</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input type="email" name="email" className="form-input" style={{ paddingLeft: '2.25rem', width: '100%' }} placeholder="correo@ejemplo.com" value={form.email} onChange={handleChange} maxLength={100} required />
              </div>
            </div>
          )}

          {view === 'reset' && (
            <>
              {submitted && !form.token && (
                <div className='form-error'>
                  <AlertCircle size={16} />
                  Enlace inválido. Solicita un nuevo correo de recuperación.
                </div>
              )}
              <div className="form-group">
                <label>Nueva Contraseña</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input type="password" name="newPassword" className="form-input" style={{ paddingLeft: '2.25rem', width: '100%' }} placeholder="••••••••" value={form.newPassword} onChange={handleChange} maxLength={12} required />
                </div>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                  La contraseña debe tener entre 6 y 12 caracteres, e incluir al menos un número o un símbolo.
                </p>
              </div>
            </>
          )}

          {(view === 'login' || view === 'register') && (
            <div className="form-group">
              <label>Contraseña</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input type="password" name="password" className="form-input" style={{ paddingLeft: '2.25rem', width: '100%' }} placeholder="••••••••" value={form.password} onChange={handleChange} maxLength={12} required />
              </div>
              {view === 'register' && (
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                  La contraseña debe tener entre 6 y 12 caracteres, e incluir al menos un número o un símbolo.
                </p>
              )}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={
              loading ||
              (view === 'register' && !isRegisterFormValid) ||
              (view === 'login' && !isLoginFormValid) ||
              (view === 'forgot' && !isForgotFormValid) ||
              (view === 'reset' && !isResetFormValid)
            }
            style={{ marginTop: '0.5rem' }}
          >
            {loading && <span className="spinner" />}
            {loading ? 'Procesando...' :
              view === 'register' ? 'Registrarse' :
                view === 'forgot' ? 'Enviar Token' :
                  view === 'reset' ? 'Actualizar Contraseña' : 'Ingresar'}
          </button>
        </form>

        {view === 'login' && (
          <div style={{ textAlign: 'center', marginTop: '1rem' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => { setView('forgot'); setError(''); setSuccess(''); }}>
              ¿Olvidaste tu contraseña?
            </button>
          </div>
        )}

        <div className="auth-toggle">
          {view === 'register' ? '¿Ya tienes cuenta? ' :
            view === 'login' ? '¿No tienes cuenta? ' :
              '¿Recordaste tu contraseña? '}
          <button onClick={() => { setView(view === 'login' ? 'register' : 'login'); setError(''); setSuccess(''); setSubmitted(false); }}>
            {view === 'login' ? 'Regístrate' : 'Inicia sesión'}
          </button>
        </div>
      </div>
    </div>
  );
}

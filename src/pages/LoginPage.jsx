import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Shield, AlertCircle, Mail, Lock, User, CreditCard, Sun, Moon, ArrowLeft } from 'lucide-react';

export default function LoginPage({ onBack }) {
  const { login, register } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    identifier: '', password: '', name: '', email: '', cedula: '',
  });

  const handleChange = (e) => { setForm({ ...form, [e.target.name]: e.target.value }); setError(''); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isRegister) {
        await register({ name: form.name, email: form.email, cedula: form.cedula, password: form.password });
      } else {
        await login(form.identifier, form.password);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

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
        <h1>{isRegister ? 'Crear Cuenta' : 'Iniciar Sesión'}</h1>
        <p className="auth-subtitle">
          {isRegister ? 'Únete a la red de seguridad ciudadana' : 'Plataforma de seguridad ciudadana'}
        </p>

        {error && <div className="form-error"><AlertCircle size={16} />{error}</div>}

        <form onSubmit={handleSubmit}>
          {isRegister && (
            <>
              <div className="form-group">
                <label>Nombre completo</label>
                <div style={{ position: 'relative' }}>
                  <User size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input type="text" name="name" className="form-input" style={{ paddingLeft: '2.25rem', width: '100%' }} placeholder="Tu nombre" value={form.name} onChange={handleChange} required />
                </div>
              </div>
              <div className="form-group">
                <label>Email</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input type="email" name="email" className="form-input" style={{ paddingLeft: '2.25rem', width: '100%' }} placeholder="correo@ejemplo.com" value={form.email} onChange={handleChange} required />
                </div>
              </div>
              <div className="form-group">
                <label>Cédula</label>
                <div style={{ position: 'relative' }}>
                  <CreditCard size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input type="text" name="cedula" className="form-input" style={{ paddingLeft: '2.25rem', width: '100%' }} placeholder="Número de cédula" value={form.cedula} onChange={handleChange} required pattern="[0-9]{6,11}" title="6 a 11 dígitos" />
                </div>
              </div>
            </>
          )}
          {!isRegister && (
            <div className="form-group">
              <label>Email o Cédula</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input type="text" name="identifier" className="form-input" style={{ paddingLeft: '2.25rem', width: '100%' }} placeholder="correo@ejemplo.com o cédula" value={form.identifier} onChange={handleChange} required />
              </div>
            </div>
          )}
          <div className="form-group">
            <label>Contraseña</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input type="password" name="password" className="form-input" style={{ paddingLeft: '2.25rem', width: '100%' }} placeholder="••••••••" value={form.password} onChange={handleChange} required minLength={6} />
            </div>
          </div>
          <button type="submit" className="btn btn-primary btn-full" disabled={loading} style={{ marginTop: '0.5rem' }}>
            {loading && <span className="spinner" />}
            {loading ? 'Procesando...' : isRegister ? 'Registrarse' : 'Ingresar'}
          </button>
        </form>

        <div className="auth-toggle">
          {isRegister ? '¿Ya tienes cuenta? ' : '¿No tienes cuenta? '}
          <button onClick={() => { setIsRegister(!isRegister); setError(''); }}>
            {isRegister ? 'Inicia sesión' : 'Regístrate'}
          </button>
        </div>
      </div>
    </div>
  );
}

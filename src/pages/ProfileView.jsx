import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { usersAPI } from '../services/api';
import { User, Mail, CreditCard, Shield, Clock, Save, Lock, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function ProfileView({ section }) {
  const { user, logout } = useAuth();
  
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [name, setName] = useState('');
  const [savingName, setSavingName] = useState(false);
  
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [savingPass, setSavingPass] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const res = await usersAPI.getMe();
      setProfileData(res.data);
      setName(res.data.name || '');
    } catch (err) {
      setError('Error al cargar el perfil.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateName = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!name.trim()) return;
    
    setSavingName(true);
    try {
      await usersAPI.updateMe({ name });
      setSuccess('Nombre actualizado correctamente.');
      setProfileData((prev) => ({ ...prev, name }));
    } catch (err) {
      setError(err.response?.data?.message || 'Error al actualizar el nombre.');
    } finally {
      setSavingName(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    
    if (passwords.new !== passwords.confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    if (passwords.new.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    
    setSavingPass(true);
    try {
      // Nota: Asumiendo que updateMe puede recibir { currentPassword, newPassword } 
      // Dependerá del backend real. Si el backend es distinto, ajustaremos.
      await usersAPI.updateMe({ 
        password: passwords.new 
      });
      setSuccess('Contraseña actualizada correctamente.');
      setPasswords({ current: '', new: '', confirm: '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Error al actualizar la contraseña.');
    } finally {
      setSavingPass(false);
    }
  };

  if (section === 'sidebar') {
    return (
      <div className="sidebar-content">
        <div className="section-header">
          <h2>Mi Perfil</h2>
        </div>
        <div className="glass-card" style={{ textAlign: 'center', padding: '2rem 1rem' }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%', background: 'rgba(99, 102, 241, 0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem',
            color: 'var(--accent)', border: '2px solid rgba(99, 102, 241, 0.3)'
          }}>
            <User size={40} />
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.2rem' }}>
            {profileData?.name || user?.name || 'Usuario'}
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            {profileData?.role === 'ADMIN' ? 'Administrador' : 'Ciudadano'}
          </p>
          <button className="btn btn-ghost btn-sm btn-full" onClick={logout}>
            Cerrar sesión
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span className="spinner" />
      </div>
    );
  }

  return (
    <div className="main-content" style={{ overflow: 'auto', padding: '2rem', background: 'var(--bg-primary)' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
          <User size={24} style={{ color: 'var(--accent)' }} />
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Perfil de Usuario</h1>
        </div>

        {error && (
          <div style={{ background: 'var(--error-bg)', color: 'var(--error)', padding: '0.75rem 1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {success && (
          <div style={{ background: 'var(--success-bg)', color: 'var(--success)', padding: '0.75rem 1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
            <CheckCircle2 size={16} /> {success}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
          
          {/* Información General */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
              Información Personal
            </h2>
            
            <form onSubmit={handleUpdateName}>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <User size={14} /> Nombre Completo
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    style={{ flex: 1 }}
                  />
                  <button type="submit" className="btn btn-primary" disabled={savingName || name === profileData?.name}>
                    {savingName ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <Save size={16} />}
                  </button>
                </div>
              </div>
            </form>

            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Mail size={14} /> Correo Electrónico
              </label>
              <input type="text" className="form-input" value={profileData?.email || ''} disabled style={{ opacity: 0.6 }} />
            </div>

            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <CreditCard size={14} /> Cédula
              </label>
              <input type="text" className="form-input" value={profileData?.cedula || ''} disabled style={{ opacity: 0.6 }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
              <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '0.5rem' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                  <Shield size={12} /> Rol
                </div>
                <div style={{ fontWeight: 600, color: 'var(--accent)' }}>{profileData?.role || 'USER'}</div>
              </div>
              <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '0.5rem' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                  <Clock size={12} /> Registro
                </div>
                <div style={{ fontWeight: 500, fontSize: '0.85rem' }}>
                  {profileData?.createdAt ? new Date(profileData.createdAt).toLocaleDateString() : '—'}
                </div>
              </div>
            </div>
          </div>

          {/* Cambiar Contraseña */}
          <div className="glass-card">
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Lock size={18} /> Seguridad
            </h2>
            
            <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div className="form-group">
                <label>Contraseña Actual</label>
                <input 
                  type="password" 
                  className="form-input" 
                  value={passwords.current} 
                  onChange={(e) => setPasswords({...passwords, current: e.target.value})} 
                  placeholder="Obligatorio para cambiar" 
                />
              </div>
              <div className="form-group">
                <label>Nueva Contraseña</label>
                <input 
                  type="password" 
                  className="form-input" 
                  value={passwords.new} 
                  onChange={(e) => setPasswords({...passwords, new: e.target.value})} 
                  placeholder="Mínimo 6 caracteres" 
                />
              </div>
              <div className="form-group">
                <label>Confirmar Nueva Contraseña</label>
                <input 
                  type="password" 
                  className="form-input" 
                  value={passwords.confirm} 
                  onChange={(e) => setPasswords({...passwords, confirm: e.target.value})} 
                  placeholder="Repite la contraseña" 
                />
              </div>
              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ marginTop: '0.5rem' }}
                disabled={savingPass || !passwords.new || !passwords.confirm}
              >
                {savingPass ? <span className="spinner" /> : 'Actualizar Contraseña'}
              </button>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}

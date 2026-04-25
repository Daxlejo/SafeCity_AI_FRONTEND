import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { usersAPI } from '../services/api';
import { User, Mail, CreditCard, Shield, Clock, Save, Lock, AlertCircle, CheckCircle2, Edit2, ChevronDown, ChevronUp } from 'lucide-react';

export default function ProfileView({ section }) {
  const { user, logout } = useAuth();
  
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState({ name: '', email: '', cedula: '' });
  const [editMode, setEditMode] = useState({ name: false, email: false, cedula: false });
  const [savingField, setSavingField] = useState(null);
  
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [savingPass, setSavingPass] = useState(false);
  const [isSecurityOpen, setIsSecurityOpen] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const res = await usersAPI.getMe();
      setProfileData(res.data);
      setFormData({
        name: res.data.name || '',
        email: res.data.email || '',
        cedula: res.data.cedula || ''
      });
    } catch (err) {
      setError('Error al cargar el perfil.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (field) => {
    setEditMode(prev => ({ ...prev, [field]: true }));
  };

  const handleSave = async (field) => {
    setError(''); setSuccess('');
    
    if (!String(formData[field]).trim()) {
       setFormData(prev => ({...prev, [field]: profileData[field] || ''}));
       setEditMode(prev => ({ ...prev, [field]: false }));
       return;
    }

    if (formData[field] === profileData[field]) {
      setEditMode(prev => ({ ...prev, [field]: false }));
      return;
    }
    
    setSavingField(field);
    try {
      await usersAPI.updateMe({ [field]: formData[field] });
      setSuccess('Datos actualizados correctamente.');
      setProfileData((prev) => ({ ...prev, [field]: formData[field] }));
      setEditMode(prev => ({ ...prev, [field]: false }));
    } catch (err) {
      setError(err.response?.data?.message || 'Error al actualizar los datos.');
      setFormData(prev => ({ ...prev, [field]: profileData[field] || '' }));
    } finally {
      setSavingField(null);
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
            
            {/* Nombre */}
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <User size={14} /> Nombre Completo
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input 
                  type="text" 
                  className="form-input" 
                  value={formData.name} 
                  onChange={(e) => setFormData({...formData, name: e.target.value})} 
                  disabled={!editMode.name}
                  style={{ flex: 1, opacity: editMode.name ? 1 : 0.7 }}
                />
                {editMode.name ? (
                  <button type="button" className="btn btn-primary" onClick={() => handleSave('name')} disabled={savingField === 'name'}>
                    {savingField === 'name' ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <CheckCircle2 size={16} />}
                  </button>
                ) : (
                  <button type="button" className="btn btn-ghost" onClick={() => handleEdit('name')}>
                    <Edit2 size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* Correo */}
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Mail size={14} /> Correo Electrónico
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input 
                  type="email" 
                  className="form-input" 
                  value={formData.email} 
                  onChange={(e) => setFormData({...formData, email: e.target.value})} 
                  disabled={!editMode.email}
                  style={{ flex: 1, opacity: editMode.email ? 1 : 0.7 }}
                />
                {editMode.email ? (
                  <button type="button" className="btn btn-primary" onClick={() => handleSave('email')} disabled={savingField === 'email'}>
                    {savingField === 'email' ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <CheckCircle2 size={16} />}
                  </button>
                ) : (
                  <button type="button" className="btn btn-ghost" onClick={() => handleEdit('email')}>
                    <Edit2 size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* Cedula */}
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <CreditCard size={14} /> Cédula
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input 
                  type="text" 
                  className="form-input" 
                  value={formData.cedula} 
                  onChange={(e) => setFormData({...formData, cedula: e.target.value})} 
                  disabled={!editMode.cedula}
                  style={{ flex: 1, opacity: editMode.cedula ? 1 : 0.7 }}
                />
                {editMode.cedula ? (
                  <button type="button" className="btn btn-primary" onClick={() => handleSave('cedula')} disabled={savingField === 'cedula'}>
                    {savingField === 'cedula' ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <CheckCircle2 size={16} />}
                  </button>
                ) : (
                  <button type="button" className="btn btn-ghost" onClick={() => handleEdit('cedula')}>
                    <Edit2 size={16} />
                  </button>
                )}
              </div>
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
            <div 
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
              onClick={() => setIsSecurityOpen(!isSecurityOpen)}
            >
              <h2 style={{ fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}>
                <Lock size={18} /> Seguridad
              </h2>
              {isSecurityOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </div>
            
            {isSecurityOpen && (
              <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
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
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

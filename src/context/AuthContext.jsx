import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import { disconnectWebSocket } from '../services/websocket';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Cargar sesión del localStorage al montar
  useEffect(() => {
    const savedToken = localStorage.getItem('safecity_token');
    const savedUser = localStorage.getItem('safecity_user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = async (identifier, password) => {
    const res = await authAPI.login({ identifier, password });
    const { token: newToken, user: userData } = res.data;
    setToken(newToken);
    setUser(userData);
    localStorage.setItem('safecity_token', newToken);
    localStorage.setItem('safecity_user', JSON.stringify(userData));
    return userData;
  };

  const register = async (data) => {
    const res = await authAPI.register(data);
    const { token: newToken, user: userData } = res.data;
    setToken(newToken);
    setUser(userData);
    localStorage.setItem('safecity_token', newToken);
    localStorage.setItem('safecity_user', JSON.stringify(userData));
    return userData;
  };

  const logout = () => {
    // Purgar absolutamente TODO el estado de sesión
    Object.keys(localStorage)
      .filter(key => key.startsWith('safecity_'))
      .forEach(key => localStorage.removeItem(key));
    sessionStorage.clear();

    // Desconectar WebSocket antes de redirigir
    try { disconnectWebSocket(); } catch (_) { /* silent */ }

    // Hard redirect: desmonta TODOS los componentes protegidos en memoria
    window.location.href = '/';
  };

  const isAdmin = user?.role === 'ADMIN';
  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, isAdmin, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

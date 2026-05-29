import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { authAPI } from '../services/api';
import { hashPassword } from '../utils/hashPassword';
import { disconnectWebSocket } from '../services/websocket';

// ═══════════════════════════════════════════
// AUTH CONTEXT — SafeCity AI
// ═══════════════════════════════════════════
// Responsabilidades:
//   1. Persistir sesión en localStorage
//   2. Proveer login, register, logout
//   3. Monitorear expiración del JWT (20 min)
//   4. Renovar token automáticamente si quedan < 5 min
//      de vida y el usuario sigue activo
//   5. Limpiar sesión y redirigir si el token expira
// ═══════════════════════════════════════════

const AuthContext = createContext(null);

// Intervalo de chequeo de expiración del token (cada 60 segundos)
const TOKEN_CHECK_INTERVAL_MS = 60 * 1000;
// Umbral para renovar: si quedan menos de 5 minutos
const TOKEN_REFRESH_THRESHOLD_MS = 5 * 60 * 1000;

/**
 * Decodifica el payload de un JWT (sin verificar firma).
 * Retorna null si el token es inválido.
 */
function decodeJwtPayload(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

/**
 * Calcula los milisegundos restantes hasta la expiración del JWT.
 * Retorna 0 si el token ya expiró o es inválido.
 */
function getTokenRemainingMs(token) {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return 0;
  const expiresAtMs = payload.exp * 1000;
  return Math.max(0, expiresAtMs - Date.now());
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const refreshingRef = useRef(false);

  // Cargar sesión del localStorage al montar
  useEffect(() => {
    const savedToken = localStorage.getItem('safecity_token');
    const savedUser = localStorage.getItem('safecity_user');
    if (savedToken && savedUser) {
      // Verificar que el token no haya expirado durante la ausencia del usuario
      const remaining = getTokenRemainingMs(savedToken);
      if (remaining > 0) {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } else {
        // Token expirado — limpiar sesión silenciosamente
        localStorage.removeItem('safecity_token');
        localStorage.removeItem('safecity_user');
      }
    }
    setLoading(false);
  }, []);

  // ═══════════════════════════════════════════
  // MONITOR DE EXPIRACIÓN DEL JWT
  // ═══════════════════════════════════════════
  // Cada 60s verifica si el token está por expirar.
  // Si quedan < 5 min y el usuario sigue activo → refresh.
  // Si el token ya expiró → logout inmediato.
  useEffect(() => {
    if (!token) return;

    const checkTokenExpiration = async () => {
      const remaining = getTokenRemainingMs(token);

      if (remaining <= 0) {
        // Token expirado → logout silencioso
        performLogout();
        return;
      }

      if (remaining <= TOKEN_REFRESH_THRESHOLD_MS && !refreshingRef.current) {
        // Token por expirar y usuario activo → intentar refresh
        refreshingRef.current = true;
        try {
          const res = await authAPI.refreshToken();
          const { token: newToken, user: userData } = res.data;
          setToken(newToken);
          setUser(userData);
          localStorage.setItem('safecity_token', newToken);
          localStorage.setItem('safecity_user', JSON.stringify(userData));
        } catch {
          // Si el refresh falla, el usuario será forzado a re-autenticarse
          // cuando el token expire naturalmente
        } finally {
          refreshingRef.current = false;
        }
      }
    };

    const interval = setInterval(checkTokenExpiration, TOKEN_CHECK_INTERVAL_MS);
    // Ejecutar inmediatamente al montar
    checkTokenExpiration();

    return () => clearInterval(interval);
  }, [token]);

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

  const performLogout = useCallback(() => {
    // Purgar absolutamente TODO el estado de sesión
    Object.keys(localStorage)
      .filter(key => key.startsWith('safecity_'))
      .forEach(key => localStorage.removeItem(key));
    sessionStorage.clear();

    // Desconectar WebSocket antes de redirigir
    try { disconnectWebSocket(); } catch (_) { /* silent */ }

    // Hard redirect: desmonta TODOS los componentes protegidos en memoria
    window.location.href = '/';
  }, []);

  const logout = performLogout;

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

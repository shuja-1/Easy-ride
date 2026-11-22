import { createContext, useContext, useEffect, useState } from 'react';
import { api, tokenStore } from '../api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const loadUser = async () => {
      if (!tokenStore.get()) {
        setLoading(false);
        return;
      }
      try {
        const data = await api('/auth/me');
        if (active) setUser(data.user);
      } catch {
        tokenStore.clear();
      } finally {
        if (active) setLoading(false);
      }
    };
    loadUser();
    return () => {
      active = false;
    };
  }, []);

  const login = async (credentials) => {
    const data = await api('/auth/login', { method: 'POST', body: credentials });
    tokenStore.set(data.token);
    setUser(data.user);
    return data.user;
  };

  const register = async (details) => {
    const data = await api('/auth/register', { method: 'POST', body: details });
    tokenStore.set(data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    tokenStore.clear();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
};

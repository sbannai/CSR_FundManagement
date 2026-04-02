import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('csr_user');
    if (stored && localStorage.getItem('csr_token')) {
      try { setUser(JSON.parse(stored)); } catch {}
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const res = await authAPI.login({ email, password });
    localStorage.setItem('csr_token', res.token);
    localStorage.setItem('csr_user',  JSON.stringify(res.user));
    setUser(res.user);
    return res.user;
  };

  const logout = () => {
    localStorage.removeItem('csr_token');
    localStorage.removeItem('csr_user');
    setUser(null);
  };

  const is = (...roles) => roles.includes(user?.role);
  const isAdmin     = () => user?.role === 'admin';
  const isCoord     = () => user?.role === 'csr_coordinator';
  const isBranch    = () => user?.role === 'branch_user';
  const isDonor     = () => user?.role === 'donor';
  const canManage   = () => is('admin', 'csr_coordinator');

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, is, isAdmin, isCoord, isBranch, isDonor, canManage }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

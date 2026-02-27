import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('tk_token');
    if (!token) { setLoading(false); return; }
    api.me()
      .then(data => setUser(data.user))
      .catch(() => localStorage.removeItem('tk_token'))
      .finally(() => setLoading(false));
  }, []);

  async function login(username, password) {
    const data = await api.login(username, password);
    localStorage.setItem('tk_token', data.token);
    setUser(data.user);
  }

  function logout() {
    localStorage.removeItem('tk_token');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

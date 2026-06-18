import { createContext, useContext, useState, useEffect } from 'react';
import { usuarioApi } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      setUser(JSON.parse(userData));
    }
    setLoading(false);
  }, []);

  // Busca cliente_id no MS Cliente após login (usuario_id ≠ cliente_id)
  useEffect(() => {
    if (!user || user.clienteId) return;
    usuarioApi.get('/').then(({ data }) => {
      const list = Array.isArray(data) ? data : [data];
      const cliente = list.find(c => c.usuario_id === user.id);
      if (cliente?.cliente_id) {
        const updated = { ...user, clienteId: cliente.cliente_id };
        localStorage.setItem('user', JSON.stringify(updated));
        setUser(updated);
      }
    }).catch(() => {});
  }, [user?.id]);

  const login = (token, userData) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const isAdmin = user?.role === 'Admin';

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, isAuthenticated: !!user, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

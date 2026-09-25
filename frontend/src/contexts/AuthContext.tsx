import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import { User, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  student: any | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isStudent: boolean;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [student, setStudent] = useState<any | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('attend_edge_token'));
  const [loading, setLoading] = useState<boolean>(true);

  const fetchProfile = async () => {
    try {
      if (!localStorage.getItem('attend_edge_token')) {
        setUser(null);
        setStudent(null);
        setLoading(false);
        return;
      }
      const data = await api.getMe();
      setUser({
        id: data.id,
        email: data.email,
        phone: data.phone,
        role: data.role as UserRole,
        is_active: data.is_active,
        last_login_at: data.last_login_at,
        created_at: data.created_at,
      });
      if (data.student) {
        setStudent(data.student);
      } else {
        setStudent(null);
      }
    } catch {
      api.removeToken();
      setToken(null);
      setUser(null);
      setStudent(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const login = async (identifier: string, password: string) => {
    const res = await api.login(identifier, password);
    api.setToken(res.access_token);
    setToken(res.access_token);
    await fetchProfile();
  };

  const logout = () => {
    api.removeToken();
    setToken(null);
    setUser(null);
    setStudent(null);
  };

  const refreshUser = async () => {
    await fetchProfile();
  };

  const isAdmin = user?.role === 'ADMIN';
  const isStudent = user?.role === 'STUDENT';
  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        student,
        token,
        isAuthenticated,
        isAdmin,
        isStudent,
        loading,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

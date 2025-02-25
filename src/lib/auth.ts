import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Role, User } from './db';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

// Default admin credentials - en una app real, esto estaría en la base de datos
const ADMIN_USER: User = {
  id: 'admin',
  email: 'admin',
  name: 'Administrator',
  role: 'admin' as Role,
  created_at: new Date().toISOString(),
};

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      login: async (email: string, password: string) => {
        try {
          // Para demo, usamos un simple check admin/admin
          if (email === 'admin' && password === 'admin') {
            set({ user: ADMIN_USER, isAuthenticated: true });
            return;
          }
          throw new Error('Invalid credentials');
        } catch (error) {
          console.error('Login error:', error);
          throw error;
        }
      },
      logout: () => {
        set({ user: null, isAuthenticated: false });
      },
    }),
    {
      name: 'auth-storage', // nombre único para el almacenamiento
      partialize: (state) => ({ 
        user: state.user,
        isAuthenticated: state.isAuthenticated 
      }),
    }
  )
);

export const useIsAdmin = () => {
  const user = useAuth((state) => state.user);
  return user?.role === 'admin';
};

export const useIsTeacher = () => {
  const user = useAuth((state) => state.user);
  return user?.role === 'teacher';
};
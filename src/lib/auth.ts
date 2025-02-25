import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { db } from './db';
import { Permission } from '../types';

export type Role = 'admin' | 'teacher';

export interface User {
  id: string;
  username: string;
  email: string;
  role: Role;
  teacherId?: string;
  name?: string; // Para compatibilidad con el código existente
  created_at?: string; // Para compatibilidad con el código existente
  permissions?: Permission[];
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  hasPermission: (permission: Permission) => boolean;
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      login: async (username: string, password: string) => {
        try {
          // Consultar la base de datos para verificar las credenciales
          const result = await db.execute({
            sql: `
              SELECT id, username, email, role, teacher_id, is_active, permissions
              FROM users
              WHERE username = ? AND password = ? AND is_active = 1
            `,
            args: [username, password]
          });

          if (result.rows.length === 0) {
            throw new Error('Credenciales inválidas');
          }

          const userData = result.rows[0];
          
          // Verificar que el usuario está activo
          if (!userData.is_active) {
            throw new Error('Usuario inactivo');
          }

          const user: User = {
            id: userData.id as string,
            username: userData.username as string,
            email: userData.email as string,
            role: userData.role as Role,
            teacherId: userData.teacher_id as string | undefined,
            name: userData.username as string, // Para compatibilidad
            created_at: new Date().toISOString(), // Para compatibilidad
            permissions: userData.permissions ? JSON.parse(userData.permissions as string) : []
          };

          set({ user, isAuthenticated: true });
        } catch (error) {
          console.error('Error de inicio de sesión:', error);
          throw error;
        }
      },
      logout: () => {
        set({ user: null, isAuthenticated: false });
      },
      hasPermission: (permission: Permission) => {
        const { user } = get();
        if (!user) return false;
        if (user.role === 'admin') return true;
        return user.permissions?.includes(permission) || false;
      }
    }),
    {
      name: 'auth-storage',
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

export const useHasPermission = (permission: Permission) => {
  return useAuth((state) => state.hasPermission(permission));
};
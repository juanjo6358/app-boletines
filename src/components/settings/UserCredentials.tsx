import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Key, Shield } from 'lucide-react';
import { getUsers, createUser, updateUser, deleteUser, updateUserPassword } from '../../lib/db';
import { User, Permission } from '../../types';

interface UserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (user: Partial<User>) => void;
  user?: User;
}

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

interface PasswordDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (userId: string, newPassword: string) => void;
  userId: string;
  username: string;
}

interface PermissionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (userId: string, permissions: Permission[]) => void;
  userId: string;
  username: string;
  currentPermissions: Permission[];
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message 
}) => {
  if (!isOpen) return null;
  
  return (
    <div className="flex fixed inset-0 z-50 justify-center items-center bg-black bg-opacity-50">
      <div className="p-6 w-full max-w-md bg-white rounded-lg shadow-xl">
        <h3 className="mb-4 text-lg font-semibold text-red-600">
          {title}
        </h3>
        <p className="mb-6 text-gray-700">
          {message}
        </p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-4 py-2 text-white bg-red-600 rounded hover:bg-red-700"
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
};

const UserDialog: React.FC<UserDialogProps> = ({ isOpen, onClose, onSave, user }) => {
  const [formData, setFormData] = useState<Partial<User>>({
    username: '',
    role: 'teacher',
    email: '',
    isActive: true,
    ...user
  });

  // Actualizar formData cuando cambia el usuario seleccionado
  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username,
        role: user.role,
        email: user.email,
        isActive: user.isActive,
        teacherId: user.teacherId,
        permissions: user.permissions
      });
    } else {
      setFormData({
        username: '',
        role: 'teacher',
        email: '',
        isActive: true
      });
    }
  }, [user]);

  if (!isOpen) return null;

  return (
    <div className="flex fixed inset-0 z-50 justify-center items-center bg-black bg-opacity-50">
      <div className="p-6 w-full max-w-md bg-white rounded-lg shadow-xl">
        <h3 className="mb-4 text-lg font-semibold">
          {user ? 'Editar Usuario' : 'Nuevo Usuario'}
        </h3>
        
        <form onSubmit={(e) => {
          e.preventDefault();
          onSave(formData);
        }}>
          <div className="space-y-4">
            <div>
              <label className="block mb-1 text-sm font-medium">
                Nombre de usuario
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})}
                className="p-2 w-full rounded border"
                aria-label="Nombre de usuario"
                placeholder="Ingrese nombre de usuario"
                required
              />
            </div>

            <div>
              <label className="block mb-1 text-sm font-medium">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="p-2 w-full rounded border"
                aria-label="Email"
                placeholder="Ingrese email"
                required
              />
            </div>

            <div>
              <label className="block mb-1 text-sm font-medium">
                Rol
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({...formData, role: e.target.value as 'admin' | 'teacher'})}
                className="p-2 w-full rounded border"
                aria-label="Rol"
              >
                <option value="teacher">Profesor</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                className="mr-2"
                aria-label="Usuario activo"
                title="Activar/desactivar usuario"
              />
              <label className="text-sm font-medium">
                Usuario activo
              </label>
            </div>
          </div>

          <div className="flex gap-2 justify-end mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700"
            >
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const PasswordDialog: React.FC<PasswordDialogProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  userId,
  username 
}) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setConfirmPassword('');
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    
    onSave(userId, password);
    onClose();
  };

  return (
    <div className="flex fixed inset-0 z-50 justify-center items-center bg-black bg-opacity-50">
      <div className="p-6 w-full max-w-md bg-white rounded-lg shadow-xl">
        <h3 className="mb-4 text-lg font-semibold">
          Cambiar Contraseña: {username}
        </h3>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block mb-1 text-sm font-medium">
                Nueva Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="p-2 w-full rounded border"
                placeholder="Ingrese nueva contraseña"
                required
              />
            </div>

            <div>
              <label className="block mb-1 text-sm font-medium">
                Confirmar Contraseña
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="p-2 w-full rounded border"
                placeholder="Confirme la contraseña"
                required
              />
            </div>

            {error && (
              <div className="p-2 text-sm text-red-600 bg-red-50 rounded">
                {error}
              </div>
            )}
          </div>

          <div className="flex gap-2 justify-end mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700"
            >
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const permissionOptions: { value: Permission; label: string }[] = [
  { value: 'view_students', label: 'Ver estudiantes' },
  { value: 'edit_students', label: 'Editar estudiantes' },
  { value: 'view_courses', label: 'Ver cursos' },
  { value: 'edit_courses', label: 'Editar cursos' },
  { value: 'view_grades', label: 'Ver calificaciones' },
  { value: 'edit_grades', label: 'Editar calificaciones' },
  { value: 'view_report_cards', label: 'Ver boletines' },
  { value: 'edit_report_cards', label: 'Editar boletines' },
  { value: 'view_teachers', label: 'Ver profesores' },
  { value: 'edit_teachers', label: 'Editar profesores' },
  { value: 'view_teacher_subjects', label: 'Ver asignaturas de profesores' },
  { value: 'edit_teacher_subjects', label: 'Editar asignaturas de profesores' }
];

const PermissionDialog: React.FC<PermissionDialogProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  userId,
  username,
  currentPermissions
}) => {
  const [permissions, setPermissions] = useState<Permission[]>(currentPermissions || []);

  useEffect(() => {
    if (isOpen) {
      setPermissions(currentPermissions || []);
    }
  }, [isOpen, currentPermissions]);

  if (!isOpen) return null;

  const handleTogglePermission = (permission: Permission) => {
    if (permissions.includes(permission)) {
      setPermissions(permissions.filter(p => p !== permission));
    } else {
      setPermissions([...permissions, permission]);
    }
  };

  const handleSelectAll = () => {
    setPermissions(permissionOptions.map(option => option.value));
  };

  const handleDeselectAll = () => {
    setPermissions([]);
  };

  return (
    <div className="flex fixed inset-0 z-50 justify-center items-center bg-black bg-opacity-50">
      <div className="p-6 w-full max-w-md bg-white rounded-lg shadow-xl">
        <h3 className="mb-4 text-lg font-semibold">
          Permisos: {username}
        </h3>
        
        <div className="flex justify-end mb-4 space-x-2">
          <button
            onClick={handleSelectAll}
            className="px-2 py-1 text-xs text-blue-600 rounded border border-blue-600 hover:bg-blue-50"
          >
            Seleccionar todos
          </button>
          <button
            onClick={handleDeselectAll}
            className="px-2 py-1 text-xs text-red-600 rounded border border-red-600 hover:bg-red-50"
          >
            Deseleccionar todos
          </button>
        </div>
        
        <div className="overflow-y-auto mb-6 max-h-60">
          <div className="space-y-2">
            {permissionOptions.map(option => (
              <label key={option.value} className="flex items-center">
                <input
                  type="checkbox"
                  checked={permissions.includes(option.value)}
                  onChange={() => handleTogglePermission(option.value)}
                  className="mr-2"
                />
                <span className="text-sm">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              onSave(userId, permissions);
              onClose();
            }}
            className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
};

export function UserCredentials() {
  const [users, setUsers] = useState<User[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | undefined>(undefined);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [userForPasswordChange, setUserForPasswordChange] = useState<{id: string, username: string} | null>(null);
  const [isPermissionDialogOpen, setIsPermissionDialogOpen] = useState(false);
  const [userForPermissions, setUserForPermissions] = useState<{id: string, username: string, permissions: Permission[]} | null>(null);
  const [loading, setLoading] = useState(true);

  // Función para cargar los usuarios
  const loadUsers = async () => {
    try {
      setLoading(true);
      const usersData = await getUsers();
      setUsers(usersData);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  // Cargar usuarios al montar el componente
  useEffect(() => {
    loadUsers();
    
    // Configurar un intervalo para recargar los usuarios cada 30 segundos
    const interval = setInterval(() => {
      loadUsers();
    }, 30000);
    
    // Limpiar el intervalo al desmontar
    return () => clearInterval(interval);
  }, []);

  const handleAddUser = () => {
    setSelectedUser(undefined);
    setIsDialogOpen(true);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setIsDialogOpen(true);
  };

  const handleDeleteUser = (userId: string) => {
    setUserToDelete(userId);
    setIsConfirmOpen(true);
  };

  const confirmDeleteUser = async () => {
    if (userToDelete) {
      try {
        await deleteUser(userToDelete);
        // Recargar la lista de usuarios después de eliminar
        await loadUsers();
        setIsConfirmOpen(false);
        setUserToDelete(null);
      } catch (error) {
        console.error('Error deleting user:', error);
      }
    }
  };

  const handleSaveUser = async (userData: Partial<User>) => {
    try {
      if (selectedUser) {
        // Actualizar usuario existente
        await updateUser(selectedUser.id, userData);
      } else {
        // Crear nuevo usuario
        await createUser(userData);
      }
      // Recargar la lista de usuarios después de guardar
      await loadUsers();
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error saving user:', error);
    }
  };

  const handlePasswordChange = async (userId: string, newPassword: string) => {
    try {
      await updateUserPassword(userId, newPassword);
      // No necesitamos recargar los usuarios ya que la contraseña no se muestra en la UI
    } catch (error) {
      console.error('Error updating password:', error);
    }
  };

  const handlePermissionChange = async (userId: string, permissions: Permission[]) => {
    try {
      const user = users.find(u => u.id === userId);
      if (user) {
        await updateUser(userId, { ...user, permissions });
        await loadUsers();
      }
    } catch (error) {
      console.error('Error updating permissions:', error);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Credenciales de Usuario</h2>
        <button
          onClick={handleAddUser}
          className="flex items-center px-3 py-2 text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <Plus className="mr-2 w-4 h-4" />
          Añadir Usuario
        </button>
      </div>

      {loading ? (
        <div className="py-4 text-center">
          <div className="inline-block w-8 h-8 rounded-full border-t-2 border-b-2 border-indigo-600 animate-spin"></div>
          <p className="mt-2 text-gray-600">Cargando usuarios...</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                  Usuario
                </th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                  Email
                </th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                  Rol
                </th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                  Estado
                </th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map(user => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{user.username}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {user.role === 'admin' ? 'Administrador' : 'Profesor'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {user.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium whitespace-nowrap">
                    <button
                      onClick={() => handleEditUser(user)}
                      className="mr-3 text-indigo-600 hover:text-indigo-900"
                      title="Editar usuario"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      title="Cambiar contraseña"
                      onClick={() => {
                        setUserForPasswordChange({id: user.id, username: user.username});
                        setIsPasswordDialogOpen(true);
                      }}
                      className="mr-3 text-yellow-600 hover:text-yellow-900"
                    >
                      <Key className="w-4 h-4" />
                    </button>
                    {user.role === 'teacher' && (
                      <button
                        title="Gestionar permisos"
                        onClick={() => {
                          setUserForPermissions({
                            id: user.id,
                            username: user.username,
                            permissions: user.permissions || []
                          });
                          setIsPermissionDialogOpen(true);
                        }}
                        className="mr-3 text-green-600 hover:text-green-900"
                      >
                        <Shield className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteUser(user.id)}
                      className="text-red-600 hover:text-red-900"
                      disabled={user.role === 'admin'} // No permitir eliminar administradores
                      title="Eliminar usuario"
                    >
                      <Trash2 className={`w-4 h-4 ${user.role === 'admin' ? 'opacity-30' : ''}`} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <UserDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSave={handleSaveUser}
        user={selectedUser}
      />

      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={confirmDeleteUser}
        title="Eliminar Usuario"
        message="¿Estás seguro de que deseas eliminar este usuario? Esta acción no se puede deshacer."
      />

      {/* Diálogo para cambiar contraseña */}
      {userForPasswordChange && (
        <PasswordDialog
          isOpen={isPasswordDialogOpen}
          onClose={() => {
            setIsPasswordDialogOpen(false);
            setUserForPasswordChange(null);
          }}
          onSave={handlePasswordChange}
          userId={userForPasswordChange.id}
          username={userForPasswordChange.username}
        />
      )}

      {/* Diálogo para gestionar permisos */}
      {userForPermissions && (
        <PermissionDialog
          isOpen={isPermissionDialogOpen}
          onClose={() => {
            setIsPermissionDialogOpen(false);
            setUserForPermissions(null);
          }}
          onSave={handlePermissionChange}
          userId={userForPermissions.id}
          username={userForPermissions.username}
          currentPermissions={userForPermissions.permissions}
        />
      )}
    </div>
  );
} 
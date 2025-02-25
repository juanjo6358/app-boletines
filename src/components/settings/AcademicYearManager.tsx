import { useState } from 'react';
import { PlusCircle, Pencil, Trash2, Check } from 'lucide-react';
import { AcademicYear } from '../../types';
import { useNavigate } from 'react-router-dom';

interface AcademicYearManagerProps {
  academicYears: AcademicYear[];
  onAdd: (name: string) => void;
  onEdit: (id: string, name: string) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
  onDelete: (id: string) => void;
}

export function AcademicYearManager({ 
  academicYears, 
  onAdd, 
  onEdit, 
  onToggleActive,
  onDelete 
}: AcademicYearManagerProps) {
  const navigate = useNavigate();
  const [newYear, setNewYear] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [isChanging, setIsChanging] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newYear.trim()) {
      onAdd(newYear.trim());
      setNewYear('');
    }
  };

  const handleEdit = (year: AcademicYear) => {
    setEditingId(year.id);
    setEditingName(year.name);
  };

  const handleSaveEdit = (id: string) => {
    if (editingName.trim()) {
      onEdit(id, editingName.trim());
      setEditingId(null);
    }
  };

  const handleToggleActive = async (id: string) => {
    setIsChanging(true);
    try {
      await onToggleActive(id, true);
      // Pequeña pausa para mostrar el feedback visual
      await new Promise(resolve => setTimeout(resolve, 500));
      // Recargar la página de configuración
      navigate(0);
    } catch (error) {
      console.error('Error al cambiar el año activo:', error);
      setIsChanging(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium text-gray-900">Gestión de Años Académicos</h2>
      
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          placeholder="Nuevo año académico (ej: 2023-2024)"
          className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          value={newYear}
          onChange={(e) => setNewYear(e.target.value)}
          aria-label="Nombre del nuevo año académico"
        />
        <button
          type="submit"
          className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <PlusCircle className="h-5 w-5 mr-2" />
          Añadir
        </button>
      </form>

      <ul className="divide-y divide-gray-200">
        {academicYears.map((year) => (
          <li key={year.id} className="py-4 flex items-center justify-between">
            {editingId === year.id ? (
              <div className="flex-1 mr-4">
                <input
                  type="text"
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={() => handleSaveEdit(year.id)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit(year.id)}
                  autoFocus
                  aria-label={`Editar nombre del año académico ${year.name}`}
                />
              </div>
            ) : (
              <>
                <div className="flex items-center space-x-4">
                  <span className="text-gray-900">{year.name}</span>
                  <button
                    onClick={() => {
                      if (!year.isActive && !isChanging) {
                        handleToggleActive(year.id);
                      }
                    }}
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      isChanging 
                        ? 'bg-gray-100 text-gray-400 cursor-wait'
                        : year.isActive 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    disabled={isChanging}
                    aria-label={`${year.isActive ? 'Año activo' : 'Marcar como Actual'} año académico ${year.name}`}
                  >
                    {isChanging ? (
                      <span className="flex items-center">
                        <svg className="animate-spin h-4 w-4 mr-1" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Actualizando...
                      </span>
                    ) : year.isActive ? (
                      <span className="flex items-center">
                        <Check className="h-4 w-4 mr-1" />
                        Año Actual
                      </span>
                    ) : (
                      <span className="flex items-center">
                        Marcar como Actual
                      </span>
                    )}
                  </button>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleEdit(year)}
                    className="text-indigo-600 hover:text-indigo-900"
                    aria-label={`Editar año académico ${year.name}`}
                  >
                    <Pencil className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => onDelete(year.id)}
                    className={`text-red-600 hover:text-red-900 ${
                      year.isActive ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    disabled={year.isActive}
                    aria-label={`Eliminar año académico ${year.name}`}
                    title={year.isActive ? "No se puede eliminar el año académico activo" : ""}
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
} 
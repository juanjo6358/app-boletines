import { useState } from 'react';
import { PlusCircle, Pencil, Trash2 } from 'lucide-react';
import { GroupSubject } from '../../types';
import { ConfirmDialog } from '../ConfirmDialog';

interface GroupSubjectManagerProps {
  groupSubjects: GroupSubject[];
  onAdd: (name: string) => void;
  onEdit: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}

export function GroupSubjectManager({ 
  groupSubjects, 
  onAdd, 
  onEdit, 
  onDelete 
}: GroupSubjectManagerProps) {
  const [newSubject, setNewSubject] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<GroupSubject | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = newSubject.trim();
    
    if (!trimmedName) {
      setError('El nombre de la asignatura no puede estar vacío');
      return;
    }

    if (groupSubjects.some(subject => 
      subject.name.toLowerCase() === trimmedName.toLowerCase()
    )) {
      setError('Ya existe una asignatura con este nombre');
      return;
    }

    setError(null);
    onAdd(trimmedName);
    setNewSubject('');
  };

  const handleEdit = (subject: GroupSubject) => {
    setEditingId(subject.id);
    setEditingName(subject.name);
    setError(null);
  };

  const handleSaveEdit = (id: string) => {
    const trimmedName = editingName.trim();
    
    if (!trimmedName) {
      setError('El nombre de la asignatura no puede estar vacío');
      return;
    }

    if (groupSubjects.some(subject => 
      subject.id !== id && 
      subject.name.toLowerCase() === trimmedName.toLowerCase()
    )) {
      setError('Ya existe una asignatura con este nombre');
      return;
    }

    setError(null);
    onEdit(id, trimmedName);
    setEditingId(null);
  };

  const handleConfirmDelete = () => {
    if (deleteConfirm) {
      onDelete(deleteConfirm.id);
      setDeleteConfirm(null);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium text-gray-900">Gestión de Asignaturas Grupales</h2>
      
      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Nueva asignatura grupal"
            className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            value={newSubject}
            onChange={(e) => {
              setNewSubject(e.target.value);
              setError(null);
            }}
            aria-label="Nombre de la nueva asignatura grupal"
          />
          <button
            type="submit"
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md border border-transparent hover:bg-indigo-700"
          >
            <PlusCircle className="mr-2 w-5 h-5" />
            Añadir
          </button>
        </div>
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
      </form>

      <ul className="divide-y divide-gray-200">
        {groupSubjects.map((subject) => (
          <li key={subject.id} className="flex justify-between items-center py-4">
            {editingId === subject.id ? (
              <div className="flex-1 mr-4">
                <input
                  type="text"
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={() => handleSaveEdit(subject.id)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit(subject.id)}
                  autoFocus
                  aria-label={`Editar nombre de la asignatura ${subject.name}`}
                />
              </div>
            ) : (
              <span className="text-gray-900">{subject.name}</span>
            )}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleEdit(subject)}
                className="text-indigo-600 hover:text-indigo-900"
                aria-label={`Editar asignatura ${subject.name}`}
              >
                <Pencil className="w-5 h-5" />
              </button>
              <button
                onClick={() => setDeleteConfirm(subject)}
                className="text-red-600 hover:text-red-900"
                aria-label={`Eliminar asignatura ${subject.name}`}
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </li>
        ))}
      </ul>

      <ConfirmDialog
        isOpen={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleConfirmDelete}
        title="Eliminar asignatura grupal"
        message={`¿Estás seguro de que quieres eliminar la asignatura "${deleteConfirm?.name}"? Esta acción no se puede deshacer.`}
      />
    </div>
  );
} 
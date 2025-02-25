import { useState } from 'react';
import { PlusCircle, Pencil, Trash2 } from 'lucide-react';
import { Level } from '../../types';

interface LevelManagerProps {
  levels: Level[];
  onAdd: (name: string) => void;
  onEdit: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}

export function LevelManager({ levels, onAdd, onEdit, onDelete }: LevelManagerProps) {
  const [newLevel, setNewLevel] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newLevel.trim()) {
      onAdd(newLevel.trim());
      setNewLevel('');
    }
  };

  const handleEdit = (level: Level) => {
    setEditingId(level.id);
    setEditingName(level.name);
  };

  const handleSaveEdit = (id: string) => {
    if (editingName.trim()) {
      onEdit(id, editingName.trim());
      setEditingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium text-gray-900">Gestión de Niveles</h2>
      
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          placeholder="Nuevo nivel"
          className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          value={newLevel}
          onChange={(e) => setNewLevel(e.target.value)}
          aria-label="Nombre del nuevo nivel"
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
        {levels.map((level) => (
          <li key={level.id} className="py-4 flex items-center justify-between">
            {editingId === level.id ? (
              <div className="flex-1 mr-4">
                <input
                  type="text"
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={() => handleSaveEdit(level.id)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit(level.id)}
                  autoFocus
                  aria-label={`Editar nombre del nivel ${level.name}`}
                />
              </div>
            ) : (
              <span className="text-gray-900">{level.name}</span>
            )}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleEdit(level)}
                className="text-indigo-600 hover:text-indigo-900"
                aria-label={`Editar nivel ${level.name}`}
              >
                <Pencil className="h-5 w-5" />
              </button>
              <button
                onClick={() => onDelete(level.id)}
                className="text-red-600 hover:text-red-900"
                aria-label={`Eliminar nivel ${level.name}`}
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
} 
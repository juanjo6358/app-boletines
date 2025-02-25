import { useState } from 'react';
import { PlusCircle, Pencil, Trash2 } from 'lucide-react';
import { Instrument } from '../../types';

interface InstrumentManagerProps {
  instruments: Instrument[];
  onAdd: (name: string) => void;
  onEdit: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}

export function InstrumentManager({ instruments, onAdd, onEdit, onDelete }: InstrumentManagerProps) {
  const [newInstrument, setNewInstrument] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newInstrument.trim()) {
      onAdd(newInstrument.trim());
      setNewInstrument('');
    }
  };

  const handleEdit = (instrument: Instrument) => {
    setEditingId(instrument.id);
    setEditingName(instrument.name);
  };

  const handleSaveEdit = (id: string) => {
    if (editingName.trim()) {
      onEdit(id, editingName.trim());
      setEditingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium text-gray-900">Gestión de Instrumentos</h2>
      
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          placeholder="Nuevo instrumento"
          className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          value={newInstrument}
          onChange={(e) => setNewInstrument(e.target.value)}
          aria-label="Nombre del nuevo instrumento"
        />
        <button
          type="submit"
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md border border-transparent hover:bg-indigo-700"
        >
          <PlusCircle className="mr-2 w-5 h-5" />
          Añadir
        </button>
      </form>

      <ul className="divide-y divide-gray-200">
        {instruments.map((instrument) => (
          <li key={instrument.id} className="flex justify-between items-center py-4">
            {editingId === instrument.id ? (
              <div className="flex-1 mr-4">
                <input
                  type="text"
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={() => handleSaveEdit(instrument.id)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit(instrument.id)}
                  autoFocus
                  aria-label={`Editar nombre del instrumento ${instrument.name}`}
                />
              </div>
            ) : (
              <span className="text-gray-900">{instrument.name}</span>
            )}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleEdit(instrument)}
                className="text-indigo-600 hover:text-indigo-900"
                aria-label={`Editar instrumento ${instrument.name}`}
              >
                <Pencil className="w-5 h-5" />
              </button>
              <button
                onClick={() => onDelete(instrument.id)}
                className="text-red-600 hover:text-red-900"
                aria-label={`Eliminar instrumento ${instrument.name}`}
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
} 
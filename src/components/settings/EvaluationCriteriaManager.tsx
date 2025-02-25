import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, GripVertical } from 'lucide-react';
import { EvaluationCriterion } from '../../types';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface EvaluationCriteriaManagerProps {
  criteria: EvaluationCriterion[];
  onAdd: (criterion: Omit<EvaluationCriterion, 'id'>) => Promise<void>;
  onEdit: (id: string, criterion: Partial<EvaluationCriterion>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onReorder: (criteria: EvaluationCriterion[]) => Promise<void>;
}

interface SortableItemProps {
  criterion: EvaluationCriterion;
  onEdit: () => void;
  onDelete: () => void;
}

function SortableItem({ criterion, onEdit, onDelete, onToggleDefault }: SortableItemProps & { onToggleDefault: () => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: criterion.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : 0,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center p-3 bg-white rounded-lg border shadow-sm ${
        isDragging ? 'opacity-50' : ''}`}
    >
      <button
        className="mr-2 cursor-move touch-none"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-5 h-5 text-gray-400" />
      </button>
      <span className="flex-1 font-medium">{criterion.label}</span>
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={criterion.isDefault}
            onChange={onToggleDefault}
            className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
          />
          Por defecto
        </label>
        <div className="flex gap-2">
          <button
            onClick={onEdit}
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-1 text-red-400 hover:text-red-600"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function EvaluationCriteriaManager({
  criteria,
  onAdd,
  onEdit,
  onDelete,
  onReorder
}: EvaluationCriteriaManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState('');
  const [items, setItems] = useState(criteria);

  useEffect(() => {
    setItems(criteria);
  }, [criteria]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        const newItems = arrayMove(items, oldIndex, newIndex);
        
        // Actualizar el orden en la base de datos
        onReorder(newItems.map((item, index) => ({
          ...item,
          order: index
        })));

        return newItems;
      });
    }
  };

  const handleAdd = async () => {
    if (!newLabel.trim()) return;

    try {
      await onAdd({
        label: newLabel.trim(),
        value: newLabel.trim(),
        order: items.length // Temporal, lo cambiaremos con dnd-kit
      });
      setNewLabel('');
      setIsAdding(false);
    } catch (error) {
      console.error('Error al añadir criterio:', error);
    }
  };

  const handleToggleDefault = async (criterionId: string) => {
    const criterion = items.find(c => c.id === criterionId);
    if (!criterion) return;

    // Solo puede haber un valor por defecto
    const updatedItems = items.map(item => ({
      ...item,
      isDefault: item.id === criterionId ? !item.isDefault : false
    }));

    // Actualizar en la base de datos
    try {
      await Promise.all(
        updatedItems.map(item => 
          onEdit(item.id, { isDefault: item.isDefault })
        )
      );
      setItems(updatedItems);
    } catch (error) {
      console.error('Error al actualizar valor por defecto:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium text-gray-900">Criterios de Evaluación</h2>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
        >
          <Plus className="mr-2 w-4 h-4" />
          Añadir Criterio
        </button>
      </div>

      {/* Lista de criterios */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={items.map(item => item.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {items.map((criterion) => (
              editingId === criterion.id ? (
                <div
                  key={criterion.id}
                  className="flex items-center p-3 bg-white rounded-lg border shadow-sm"
                >
                  <div className="flex flex-1 gap-4">
                    <input
                      type="text"
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.target.value)}
                      className="flex-1 px-3 py-1 rounded border"
                      placeholder="Etiqueta (ej: EXCELENTE)"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          await onEdit(criterion.id, { 
                            label: newLabel, 
                            value: newLabel
                          });
                          setEditingId(null);
                        }}
                        className="px-3 py-1 text-sm text-white bg-green-600 rounded hover:bg-green-700"
                      >
                        Guardar
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1 text-sm text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <SortableItem
                  key={criterion.id}
                  criterion={criterion}
                  onEdit={() => {
                    setNewLabel(criterion.label);
                    setEditingId(criterion.id);
                  }}
                  onDelete={() => onDelete(criterion.id)}
                  onToggleDefault={() => handleToggleDefault(criterion.id)}
                />
              )
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Formulario para añadir */}
      {isAdding && (
        <div className="p-4 bg-gray-50 rounded-lg border">
          <div className="flex gap-4 mb-4">
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              className="flex-1 px-3 py-2 rounded border"
              placeholder="Etiqueta (ej: EXCELENTE)"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => {
                setNewLabel('');
                setIsAdding(false);
              }}
              className="px-4 py-2 text-sm text-gray-600 bg-white rounded border hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleAdd}
              disabled={!newLabel.trim()}
              className="px-4 py-2 text-sm text-white bg-indigo-600 rounded hover:bg-indigo-700 disabled:opacity-50"
            >
              Guardar
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 
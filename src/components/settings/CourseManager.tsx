import { useState } from 'react';
import { PlusCircle, Pencil, Trash2, Check } from 'lucide-react';
import { Course, Level, AcademicYear } from '../../types';

interface CourseManagerProps {
  courses: Course[];
  levels: Level[];
  academicYears: AcademicYear[];
  onAdd: (name: string, levelId: string, academicYear: string) => void;
  onEdit: (id: string, name: string, levelId: string, academicYear: string) => void;
  onDelete: (id: string) => void;
}

export function CourseManager({ 
  courses, 
  levels, 
  academicYears,
  onAdd, 
  onEdit, 
  onDelete 
}: CourseManagerProps) {
  const activeYear = academicYears.find(year => year.isActive);
  
  // Recuperar el último nivel seleccionado del localStorage
  const lastSelectedLevel = localStorage.getItem('lastSelectedLevel') || '';
  
  const [newCourse, setNewCourse] = useState({ 
    name: '', 
    levelId: lastSelectedLevel, 
    academicYear: activeYear?.id || '' 
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState({ name: '', levelId: '', academicYear: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCourse.name.trim() && newCourse.levelId && newCourse.academicYear) {
      onAdd(newCourse.name.trim(), newCourse.levelId, newCourse.academicYear);
      // Mantener el nivel seleccionado después de añadir
      setNewCourse({ 
        name: '', 
        levelId: newCourse.levelId, // Mantener el mismo nivel
        academicYear: activeYear?.id || '' 
      });
    }
  };

  const handleLevelChange = (levelId: string) => {
    // Guardar el nivel seleccionado en localStorage
    localStorage.setItem('lastSelectedLevel', levelId);
    setNewCourse({ ...newCourse, levelId });
  };

  const handleEdit = (course: Course) => {
    setEditingId(course.id);
    setEditingData({
      name: course.name,
      levelId: course.levelId,
      academicYear: course.academicYear,
    });
  };

  const handleSaveEdit = (id: string) => {
    if (editingData.name.trim() && editingData.levelId && editingData.academicYear) {
      onEdit(id, editingData.name.trim(), editingData.levelId, editingData.academicYear);
      setEditingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium text-gray-900">Gestión de Cursos</h2>
      
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="flex-1 flex gap-2">
          <input
            type="text"
            placeholder="Nombre del curso"
            className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            value={newCourse.name}
            onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })}
            aria-label="Nombre del nuevo curso"
          />
          <select
            className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            value={newCourse.levelId}
            onChange={(e) => handleLevelChange(e.target.value)}
            aria-label="Nivel del curso"
          >
            <option value="">Seleccionar nivel</option>
            {levels.map((level) => (
              <option key={level.id} value={level.id}>
                {level.name}
              </option>
            ))}
          </select>
          <div className="inline-flex items-center px-3 py-2 border border-gray-300 bg-gray-50 text-gray-500 text-sm rounded-md">
            {activeYear ? (
              <span className="flex items-center">
                <Check className="h-4 w-4 mr-2 text-green-600" />
                {activeYear.name}
              </span>
            ) : (
              'No hay año académico activo'
            )}
          </div>
        </div>
        <button
          type="submit"
          className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          disabled={!activeYear}
        >
          <PlusCircle className="h-5 w-5 mr-2" />
          Añadir
        </button>
      </form>

      <ul className="divide-y divide-gray-200">
        {courses.map((course) => (
          <li key={course.id} className="py-4 flex items-center justify-between">
            {editingId === course.id ? (
              <div className="flex-1 flex gap-2 mr-4">
                <input
                  type="text"
                  className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  value={editingData.name}
                  onChange={(e) => setEditingData({ ...editingData, name: e.target.value })}
                  aria-label={`Editar nombre del curso ${course.name}`}
                  autoFocus
                />
                <select
                  className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  value={editingData.levelId}
                  onChange={(e) => setEditingData({ ...editingData, levelId: e.target.value })}
                  aria-label={`Editar nivel del curso ${course.name}`}
                >
                  {levels.map((level) => (
                    <option key={level.id} value={level.id}>
                      {level.name}
                    </option>
                  ))}
                </select>
                <div className="inline-flex items-center px-3 py-2 border border-gray-300 bg-gray-50 text-gray-500 text-sm rounded-md">
                  {activeYear?.name}
                </div>
                <button
                  onClick={() => handleSaveEdit(course.id)}
                  className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                >
                  Guardar
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center space-x-4">
                  <span className="text-gray-900">{course.name}</span>
                  <span className="text-gray-500">•</span>
                  <span className="text-gray-600">{levels.find(l => l.id === course.levelId)?.name}</span>
                  <span className="text-gray-500">•</span>
                  <span className="text-gray-600">
                    {academicYears.find(y => y.id === course.academicYear)?.name}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleEdit(course)}
                    className="text-indigo-600 hover:text-indigo-900"
                    aria-label={`Editar curso ${course.name}`}
                  >
                    <Pencil className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => onDelete(course.id)}
                    className="text-red-600 hover:text-red-900"
                    aria-label={`Eliminar curso ${course.name}`}
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
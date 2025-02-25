import { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { Teacher, Instrument, Course } from '../../types';

interface CourseWithLevel extends Omit<Course, 'levelName'> {
  levelName: string;
}

interface TeacherDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (teacher: Omit<Teacher, 'id' | 'instrumentName' | 'courseNames' | 'courseSubjects'>, courseIds: string[]) => void;
  instruments: Instrument[];
  courses: CourseWithLevel[];
  initialData?: Teacher;
}

interface FormData {
  firstName: string;
  lastName: string;
  identifier: string;
  email: string;
  username: string;
  password: string;
  instrumentId: string;
  courseIds: string[];
}

export function TeacherDialog({
  isOpen,
  onClose,
  onSave,
  instruments,
  courses,
  initialData,
}: TeacherDialogProps) {
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    identifier: '',
    email: '',
    username: '',
    password: '',
    instrumentId: '',
    courseIds: [],
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        firstName: initialData.firstName,
        lastName: initialData.lastName,
        identifier: initialData.identifier,
        email: initialData.email,
        username: initialData.username,
        password: '',
        instrumentId: initialData.instrumentId,
        courseIds: initialData.courseIds || [],
      });
    } else {
      setFormData({
        firstName: '',
        lastName: '',
        identifier: '',
        email: '',
        username: '',
        password: '',
        instrumentId: '',
        courseIds: [],
      });
    }
  }, [initialData, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCourseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const courseId = e.target.value;
    if (e.target.checked) {
      setFormData(prev => ({ ...prev, courseIds: [...prev.courseIds, courseId] }));
    } else {
      setFormData(prev => ({ ...prev, courseIds: prev.courseIds.filter(id => id !== courseId) }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onSave(formData, formData.courseIds);
      onClose();
    } catch (error) {
      console.error('Error saving teacher:', error);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="overflow-y-auto fixed inset-0 z-10">
      <div className="flex justify-center items-center px-4 min-h-screen">
        <div className="fixed inset-0 bg-black opacity-30" />

        <div className="relative p-6 mx-auto w-full max-w-2xl bg-white rounded-lg">
          <Dialog.Title className="text-lg font-medium text-gray-900">
            {initialData ? 'Editar Profesor' : 'Añadir Profesor'}
          </Dialog.Title>

          <form onSubmit={handleSubmit}>
            <div className="mt-4 space-y-4">
              {/* Fila 1: Nombre y Apellidos */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                    Nombre
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    className="block mt-1 w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                    Apellidos
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    className="block mt-1 w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    required
                  />
                </div>
              </div>

              {/* Fila 2: DNI/NIE y Email */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="identifier" className="block text-sm font-medium text-gray-700">
                    DNI/NIE
                  </label>
                  <input
                    type="text"
                    id="identifier"
                    name="identifier"
                    value={formData.identifier}
                    onChange={handleChange}
                    className="block mt-1 w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="block mt-1 w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    required
                  />
                </div>
              </div>

              {/* Fila 3: Nombre de usuario y Contraseña */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                    Nombre de usuario
                  </label>
                  <input
                    type="text"
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    className="block mt-1 w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Contraseña
                  </label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="block mt-1 w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    required={!initialData}
                    placeholder={initialData ? "Dejar en blanco para mantener la actual" : ""}
                  />
                </div>
              </div>

              {/* Fila 4: Instrumento y Cursos asignados */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="instrumentId" className="block text-sm font-medium text-gray-700">
                    Instrumento
                  </label>
                  <select
                    id="instrumentId"
                    name="instrumentId"
                    value={formData.instrumentId}
                    onChange={handleChange}
                    className="block mt-1 w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  >
                    <option value="">Selecciona un instrumento</option>
                    {instruments.map(instrument => (
                      <option key={instrument.id} value={instrument.id}>
                        {instrument.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700">
                    Cursos asignados
                  </label>
                  <div className="overflow-y-auto p-2 max-h-32 rounded-md border border-gray-300">
                    {courses.map(course => (
                      <div key={course.id} className="flex items-center mb-2">
                        <input
                          type="checkbox"
                          id={`course-${course.id}`}
                          value={course.id}
                          checked={formData.courseIds.includes(course.id)}
                          onChange={handleCourseChange}
                          className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                        />
                        <label htmlFor={`course-${course.id}`} className="block ml-2 text-sm text-gray-900">
                          {course.name} - {course.levelName}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-6 space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white rounded-md border border-gray-300 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md border border-transparent shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                {initialData ? 'Guardar cambios' : 'Crear profesor'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Dialog>
  );
} 
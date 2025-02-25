import { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { Teacher, Instrument, Course } from '../../types';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Listbox, Transition } from '@headlessui/react';

interface CourseWithLevel extends Omit<Course, 'levelName'> {
  levelName: string;
}

interface TeacherDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (teacher: Omit<Teacher, 'id'>) => Promise<Teacher>;
  instruments: Instrument[];
  courses: CourseWithLevel[];
  initialData: Teacher | null;
}

interface FormData {
  firstName: string;
  lastName: string;
  identifier: string;
  email: string;
  instrumentId: string;
  courseIds: string[];
  username: string;
  password: string;
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
    instrumentId: '',
    courseIds: [],
    username: '',
    password: '',
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        firstName: initialData.firstName,
        lastName: initialData.lastName,
        identifier: initialData.identifier,
        email: initialData.email,
        instrumentId: initialData.instrumentId,
        courseIds: initialData.courseIds,
        username: initialData.username,
        password: initialData.password || '',
      });
    } else {
      setFormData({
        firstName: '',
        lastName: '',
        identifier: '',
        email: '',
        instrumentId: '',
        courseIds: [],
        username: '',
        password: '',
      });
    }
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error saving teacher:', error);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      <div className="flex fixed inset-0 justify-center items-center p-4">
        <Dialog.Panel className="overflow-hidden p-6 w-full max-w-2xl text-left align-middle bg-white rounded-2xl shadow-xl transition-all transform">
          <Dialog.Title as="h3" className="mb-4 text-lg font-medium leading-6 text-gray-900">
            {initialData ? 'Editar Profesor' : 'Nuevo Profesor'}
          </Dialog.Title>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                  Nombre *
                </label>
                <input
                  id="firstName"
                  type="text"
                  required
                  placeholder="Introduce el nombre"
                  className="block mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                  Apellidos *
                </label>
                <input
                  id="lastName"
                  type="text"
                  required
                  placeholder="Introduce los apellidos"
                  className="block mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="identifier" className="block text-sm font-medium text-gray-700">
                  Identificador *
                </label>
                <input
                  id="identifier"
                  type="text"
                  required
                  placeholder="Introduce el identificador"
                  className="block mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  value={formData.identifier}
                  onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email *
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  placeholder="Introduce el email"
                  className="block mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Instrumento *
                </label>
                <Listbox
                  value={formData.instrumentId}
                  onChange={(value) => setFormData({ ...formData, instrumentId: value })}
                >
                  <div className="relative mt-1">
                    <Listbox.Button className="relative py-2 pr-10 pl-3 w-full text-left bg-white rounded-md border border-gray-300 shadow-sm cursor-pointer focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500">
                      <span className="block truncate">
                        {instruments.find(i => i.id === formData.instrumentId)?.name || 'Selecciona un instrumento'}
                      </span>
                      <span className="flex absolute inset-y-0 right-0 items-center pr-2 pointer-events-none">
                        <ChevronsUpDown className="w-4 h-4 text-gray-400" aria-hidden="true" />
                      </span>
                    </Listbox.Button>
                    <Transition
                      leave="transition ease-in duration-100"
                      leaveFrom="opacity-100"
                      leaveTo="opacity-0"
                    >
                      <Listbox.Options className="overflow-auto absolute z-10 py-1 mt-1 w-full max-h-60 text-base bg-white rounded-md ring-1 ring-black ring-opacity-5 shadow-lg focus:outline-none">
                        {instruments.map((instrument) => (
                          <Listbox.Option
                            key={instrument.id}
                            value={instrument.id}
                            className={({ active }) => `
                              relative cursor-pointer select-none py-2 pl-10 pr-4
                              ${active ? 'bg-indigo-100 text-indigo-900' : 'text-gray-900'}
                            `}
                          >
                            {({ selected }) => (
                              <>
                                <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                                  {instrument.name}
                                </span>
                                {selected && (
                                  <span className="flex absolute inset-y-0 left-0 items-center pl-3 text-indigo-600">
                                    <Check className="w-5 h-5" aria-hidden="true" />
                                  </span>
                                )}
                              </>
                            )}
                          </Listbox.Option>
                        ))}
                      </Listbox.Options>
                    </Transition>
                  </div>
                </Listbox>
              </div>

              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Cursos que imparte
                </label>
                <div className="overflow-y-auto space-y-2 max-h-48">
                  {courses.map((course) => (
                    <label key={course.id} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.courseIds.includes(course.id)}
                        onChange={(e) => {
                          const newCourseIds = e.target.checked
                            ? [...formData.courseIds, course.id]
                            : formData.courseIds.filter(id => id !== course.id);
                          setFormData({ ...formData, courseIds: newCourseIds });
                        }}
                        className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                      />
                      <div className="ml-2">
                        <span className="text-sm font-medium text-gray-900">
                          {course.name} - {course.levelName}
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                  Usuario *
                </label>
                <input
                  id="username"
                  type="text"
                  required
                  placeholder="Nombre de usuario"
                  className="block mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  {initialData ? 'Contraseña (dejar vacío para mantener)' : 'Contraseña *'}
                </label>
                <input
                  id="password"
                  type="password"
                  required={!initialData}
                  placeholder={initialData ? '••••••••' : 'Introduce la contraseña'}
                  className="block mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white rounded-md border border-gray-300 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
              >
                {initialData ? 'Guardar Cambios' : 'Crear Profesor'}
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
} 
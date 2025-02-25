import { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { Student, Instrument, Level, Course } from '../../types';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Listbox, Transition } from '@headlessui/react';

interface StudentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (student: Omit<Student, 'id'>) => void;
  instruments: Instrument[];
  levels: Level[];
  courses: Course[];
  initialData?: Student;
}

export function StudentDialog({
  isOpen,
  onClose,
  onSave,
  instruments,
  levels,
  courses,
  initialData,
}: StudentDialogProps) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    address: '',
    email: '',
    identifier: '',
    instrumentId: '',
    levelId: '',
    courseId: '',
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        firstName: initialData.firstName,
        lastName: initialData.lastName,
        email: initialData.email,
        address: initialData.address || '',
        identifier: initialData.identifier,
        instrumentId: initialData.instrumentId,
        levelId: initialData.levelId,
        courseId: initialData.courseId,
      });
    } else {
      setFormData({
        firstName: '',
        lastName: '',
        address: '',
        email: '',
        identifier: '',
        instrumentId: '',
        levelId: '',
        courseId: '',
      });
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    setFormData({
      firstName: '',
      lastName: '',
      address: '',
      email: '',
      identifier: '',
      instrumentId: '',
      levelId: '',
      courseId: '',
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      <div className="flex fixed inset-0 justify-center items-center p-4">
        <Dialog.Panel className="p-6 w-full max-w-3xl text-left align-middle bg-white rounded-2xl shadow-xl transition-all transform">
          <Dialog.Title as="h3" className="mb-4 text-lg font-medium leading-6 text-gray-900">
            {initialData ? 'Editar Alumno' : 'Nuevo Alumno'}
          </Dialog.Title>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Nombre *
                </label>
                <input
                  type="text"
                  required
                  aria-label="Nombre"
                  placeholder="Ingrese nombre"
                  className="block mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Apellidos *
                </label>
                <input
                  type="text"
                  required
                  aria-label="Apellidos"
                  placeholder="Ingrese apellidos"
                  className="block mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  aria-label="Email"
                  placeholder="ejemplo@dominio.com"
                  className="block mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Identificador *
                </label>
                <input
                  type="text"
                  required
                  aria-label="Identificador"
                  placeholder="Ingrese identificador"
                  className="block mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  value={formData.identifier}
                  onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Dirección
              </label>
              <input
                type="text"
                aria-label="Dirección"
                placeholder="Ingrese dirección (opcional)"
                className="block mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>

            <div className="space-y-4">
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
                <label className="block text-sm font-medium text-gray-700">
                  Nivel *
                </label>
                <Listbox
                  value={formData.levelId}
                  onChange={(value) => {
                    setFormData({ 
                      ...formData, 
                      levelId: value,
                      courseId: ''
                    });
                  }}
                >
                  <div className="relative mt-1">
                    <Listbox.Button className="relative py-2 pr-10 pl-3 w-full text-left bg-white rounded-md border border-gray-300 shadow-sm cursor-pointer focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500">
                      <span className="block truncate">
                        {levels.find(l => l.id === formData.levelId)?.name || 'Selecciona un nivel'}
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
                        {levels.map((level) => (
                          <Listbox.Option
                            key={level.id}
                            value={level.id}
                            className={({ active }) => `
                              relative cursor-pointer select-none py-2 pl-10 pr-4
                              ${active ? 'bg-indigo-100 text-indigo-900' : 'text-gray-900'}
                            `}
                          >
                            {({ selected }) => (
                              <>
                                <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                                  {level.name}
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
                <label className="block text-sm font-medium text-gray-700">
                  Curso *
                </label>
                <Listbox
                  value={formData.courseId}
                  onChange={(value) => setFormData({ ...formData, courseId: value })}
                  disabled={!formData.levelId}
                >
                  <div className="relative mt-1">
                    <Listbox.Button 
                      className={`relative py-2 pr-10 pl-3 w-full text-left bg-white rounded-md border border-gray-300 shadow-sm cursor-pointer focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                        !formData.levelId ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      <span className="block truncate">
                        {!formData.levelId 
                          ? 'Selecciona primero un nivel'
                          : (courses.find(c => c.id === formData.courseId)?.name || 'Selecciona un curso')
                        }
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
                        {courses
                          .filter(course => course.levelId === formData.levelId)
                          .map((course) => (
                            <Listbox.Option
                              key={course.id}
                              value={course.id}
                              className={({ active }) => `
                                relative cursor-pointer select-none py-2 pl-10 pr-4
                                ${active ? 'bg-indigo-100 text-indigo-900' : 'text-gray-900'}
                              `}
                            >
                              {({ selected }) => (
                                <>
                                  <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                                    {course.name}
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
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white rounded-md border border-gray-300 hover:bg-gray-50"
                onClick={onClose}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
              >
                {initialData ? 'Guardar Cambios' : 'Crear Alumno'}
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
} 
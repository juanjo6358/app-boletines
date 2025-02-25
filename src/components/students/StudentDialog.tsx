import { useState, useEffect, Fragment } from 'react';
import { Dialog, Listbox, Transition } from '@headlessui/react';
import { Check, ChevronDown } from 'lucide-react';
import { Student, Instrument, Level, Course } from '../../types';

interface StudentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (studentData: Omit<Student, 'id' | 'courseName' | 'instrumentName'>) => Promise<void>;
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
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<Level | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedInstrument, setSelectedInstrument] = useState<Instrument | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredCourses = selectedLevel 
    ? courses.filter(course => course.levelId === selectedLevel.id)
    : courses;

  useEffect(() => {
    if (initialData) {
      setFirstName(initialData.firstName);
      setLastName(initialData.lastName);
      setIdentifier(initialData.identifier);
      setEmail(initialData.email || '');
      setPhone(initialData.phone || '');
      setAddress(initialData.address || '');
      
      const course = courses.find(c => c.id === initialData.courseId);
      if (course) {
        setSelectedCourse(course);
        const level = levels.find(l => l.id === course.levelId);
        if (level) {
          setSelectedLevel(level);
        }
      }
      
      const instrument = instruments.find(i => i.id === initialData.instrumentId);
      if (instrument) {
        setSelectedInstrument(instrument);
      }
    } else {
      resetForm();
    }
  }, [initialData, courses, levels, instruments, isOpen]);

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setIdentifier('');
    setEmail('');
    setPhone('');
    setAddress('');
    setSelectedLevel(null);
    setSelectedCourse(null);
    setSelectedInstrument(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCourse || !selectedInstrument) {
      return; // No permitir enviar si faltan campos requeridos
    }
    
    setIsSubmitting(true);

    try {
      await onSave({
        firstName,
        lastName,
        identifier,
        email: email || null,
        phone: phone || null,
        address: address || null,
        courseId: selectedCourse.id,
        instrumentId: selectedInstrument.id,
      });
      
      resetForm();
      onClose();
    } catch (error) {
      console.error('Error al guardar estudiante:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="fixed inset-0 z-10 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-black opacity-30" />

        <div className="relative bg-white rounded-lg max-w-2xl w-full p-6 shadow-xl">
          <Dialog.Title className="text-lg font-medium text-gray-900 mb-4">
            {initialData ? 'Editar Alumno' : 'Añadir Alumno'}
          </Dialog.Title>

          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              {/* Primera fila: Nombre y Apellidos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                    Nombre
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                    Apellidos
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Segunda fila: DNI/NIE y Email */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="identifier" className="block text-sm font-medium text-gray-700">
                    DNI/NIE
                  </label>
                  <input
                    type="text"
                    id="identifier"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Tercera fila: Teléfono y Dirección */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                    Dirección
                  </label>
                  <input
                    type="text"
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Cuarta fila: Nivel y Curso */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nivel
                  </label>
                  <Listbox value={selectedLevel} onChange={(level) => {
                    setSelectedLevel(level);
                    setSelectedCourse(null);
                  }}>
                    <div className="relative">
                      <Listbox.Button className="relative w-full py-2 pl-3 pr-10 text-left bg-white border border-gray-300 rounded-md shadow-sm cursor-default focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500">
                        <span className="block truncate">
                          {selectedLevel ? selectedLevel.name : 'Seleccionar nivel'}
                        </span>
                        <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                          <ChevronDown className="w-5 h-5 text-gray-400" aria-hidden="true" />
                        </span>
                      </Listbox.Button>
                      <Transition
                        as={Fragment}
                        leave="transition ease-in duration-100"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                      >
                        <Listbox.Options className="absolute z-10 w-full py-1 mt-1 overflow-auto text-base bg-white rounded-md shadow-lg max-h-60 ring-1 ring-black ring-opacity-5 focus:outline-none">
                          {levels.map((level) => (
                            <Listbox.Option
                              key={level.id}
                              className={({ active }) =>
                                `${active ? 'text-white bg-indigo-600' : 'text-gray-900'}
                                cursor-default select-none relative py-2 pl-10 pr-4`
                              }
                              value={level}
                            >
                              {({ selected, active }) => (
                                <>
                                  <span className={`${selected ? 'font-medium' : 'font-normal'} block truncate`}>
                                    {level.name}
                                  </span>
                                  {selected ? (
                                    <span className={`${active ? 'text-white' : 'text-indigo-600'} absolute inset-y-0 left-0 flex items-center pl-3`}>
                                      <Check className="w-5 h-5" aria-hidden="true" />
                                    </span>
                                  ) : null}
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Curso
                  </label>
                  <Listbox 
                    value={selectedCourse} 
                    onChange={setSelectedCourse}
                    disabled={!selectedLevel}
                  >
                    <div className="relative">
                      <Listbox.Button className={`relative w-full py-2 pl-3 pr-10 text-left bg-white border border-gray-300 rounded-md shadow-sm cursor-default focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 ${!selectedLevel ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        <span className="block truncate">
                          {selectedCourse ? selectedCourse.name : 'Seleccionar curso'}
                        </span>
                        <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                          <ChevronDown className="w-5 h-5 text-gray-400" aria-hidden="true" />
                        </span>
                      </Listbox.Button>
                      {selectedLevel && (
                        <Transition
                          as={Fragment}
                          leave="transition ease-in duration-100"
                          leaveFrom="opacity-100"
                          leaveTo="opacity-0"
                        >
                          <Listbox.Options className="absolute z-10 w-full py-1 mt-1 overflow-auto text-base bg-white rounded-md shadow-lg max-h-60 ring-1 ring-black ring-opacity-5 focus:outline-none">
                            {filteredCourses.map((course) => (
                              <Listbox.Option
                                key={course.id}
                                className={({ active }) =>
                                  `${active ? 'text-white bg-indigo-600' : 'text-gray-900'}
                                  cursor-default select-none relative py-2 pl-10 pr-4`
                                }
                                value={course}
                              >
                                {({ selected, active }) => (
                                  <>
                                    <span className={`${selected ? 'font-medium' : 'font-normal'} block truncate`}>
                                      {course.name}
                                    </span>
                                    {selected ? (
                                      <span className={`${active ? 'text-white' : 'text-indigo-600'} absolute inset-y-0 left-0 flex items-center pl-3`}>
                                        <Check className="w-5 h-5" aria-hidden="true" />
                                      </span>
                                    ) : null}
                                  </>
                                )}
                              </Listbox.Option>
                            ))}
                          </Listbox.Options>
                        </Transition>
                      )}
                    </div>
                  </Listbox>
                </div>
              </div>

              {/* Quinta fila: Instrumento */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Instrumento
                </label>
                <Listbox value={selectedInstrument} onChange={setSelectedInstrument}>
                  <div className="relative">
                    <Listbox.Button className="relative w-full py-2 pl-3 pr-10 text-left bg-white border border-gray-300 rounded-md shadow-sm cursor-default focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500">
                      <span className="block truncate">
                        {selectedInstrument ? selectedInstrument.name : 'Seleccionar instrumento'}
                      </span>
                      <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                        <ChevronDown className="w-5 h-5 text-gray-400" aria-hidden="true" />
                      </span>
                    </Listbox.Button>
                    <Transition
                      as={Fragment}
                      leave="transition ease-in duration-100"
                      leaveFrom="opacity-100"
                      leaveTo="opacity-0"
                    >
                      <Listbox.Options className="absolute z-10 w-full py-1 mt-1 overflow-auto text-base bg-white rounded-md shadow-lg max-h-60 ring-1 ring-black ring-opacity-5 focus:outline-none">
                        {instruments.map((instrument) => (
                          <Listbox.Option
                            key={instrument.id}
                            className={({ active }) =>
                              `${active ? 'text-white bg-indigo-600' : 'text-gray-900'}
                              cursor-default select-none relative py-2 pl-10 pr-4`
                            }
                            value={instrument}
                          >
                            {({ selected, active }) => (
                              <>
                                <span className={`${selected ? 'font-medium' : 'font-normal'} block truncate`}>
                                  {instrument.name}
                                </span>
                                {selected ? (
                                  <span className={`${active ? 'text-white' : 'text-indigo-600'} absolute inset-y-0 left-0 flex items-center pl-3`}>
                                    <Check className="w-5 h-5" aria-hidden="true" />
                                  </span>
                                ) : null}
                              </>
                            )}
                          </Listbox.Option>
                        ))}
                      </Listbox.Options>
                    </Transition>
                  </div>
                </Listbox>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !selectedCourse || !selectedInstrument}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {isSubmitting ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </Dialog>
  );
} 
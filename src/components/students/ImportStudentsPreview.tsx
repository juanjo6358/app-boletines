import { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { Save, Edit2, X } from 'lucide-react';
import { Course, Instrument } from '../../types';

export interface StudentToImport {
  firstName: string;
  lastName: string;
  identifier: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  courseId: string;
  courseName?: string;
  levelId: string;
  instrumentId: string;
  instrumentName?: string;
  [key: string]: any;
}

interface ImportStudentsPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (students: StudentToImport[]) => void;
  students: StudentToImport[];
  courses: Course[];
  instruments: Instrument[];
}

export function ImportStudentsPreview({
  isOpen,
  onClose,
  onConfirm,
  students: initialStudents,
  courses,
  instruments,
}: ImportStudentsPreviewProps) {
  const [students, setStudents] = useState<StudentToImport[]>(initialStudents);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<StudentToImport | null>(null);

  // Mapa para buscar nombres por ID
  const courseMap = new Map(courses.map(c => [c.id, c.name]));
  const instrumentMap = new Map(instruments.map(i => [i.id, i.name]));

  // Añade este efecto para actualizar los estudiantes cuando cambian los props
  useEffect(() => {
    console.log("ImportStudentsPreview recibió", initialStudents.length, "estudiantes");
    setStudents(initialStudents);
  }, [initialStudents]);

  // Añadir un efecto para registrar cuando el diálogo se abre
  useEffect(() => {
    console.log("Estado del diálogo ImportStudentsPreview:", isOpen);
  }, [isOpen]);

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setEditForm({...students[index]});
  };

  const handleSaveEdit = () => {
    if (editForm && editingIndex !== null) {
      const updatedStudents = [...students];
      updatedStudents[editingIndex] = editForm;
      setStudents(updatedStudents);
      setEditingIndex(null);
      setEditForm(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditForm(null);
  };

  const handleInputChange = (field: string, value: any) => {
    if (editForm) {
      setEditForm({...editForm, [field]: value});
    }
  };

  const handleConfirm = () => {
    onConfirm(students);
  };

  return (
    <Dialog 
      open={isOpen} 
      onClose={onClose} 
      className="overflow-y-auto fixed inset-0 z-20"
    >
      <div className="flex justify-center items-center px-4 min-h-screen">
        <div className="fixed inset-0 bg-black opacity-30" />

        <div className="relative p-6 w-full max-w-6xl bg-white rounded-lg shadow-xl">
          <Dialog.Title className="flex justify-between items-center mb-4 text-lg font-medium text-gray-900">
            <span>Vista previa de importación ({students.length} alumnos)</span>
            <button 
              onClick={onClose} 
              className="text-gray-400 hover:text-gray-500"
              title="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </Dialog.Title>

          <div className="mb-4">
            <p className="text-sm text-gray-600">
              Revisa y edita los datos de los alumnos antes de importarlos. Haz clic en el icono de editar para modificar un alumno.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-3 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                    Nombre
                  </th>
                  <th scope="col" className="px-3 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                    Apellidos
                  </th>
                  <th scope="col" className="px-3 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                    DNI/NIE
                  </th>
                  <th scope="col" className="px-3 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                    Email
                  </th>
                  <th scope="col" className="px-3 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                    Teléfono
                  </th>
                  <th scope="col" className="px-3 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                    Dirección
                  </th>
                  <th scope="col" className="px-3 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                    Curso
                  </th>
                  <th scope="col" className="px-3 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                    Instrumento
                  </th>
                  <th scope="col" className="px-3 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {students.map((student, index) => (
                  <tr key={index} className={index === editingIndex ? 'bg-blue-50' : ''}>
                    {index === editingIndex && editForm ? (
                      // Modo edición
                      <>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={editForm.firstName}
                            onChange={(e) => handleInputChange('firstName', e.target.value)}
                            className="p-1 w-full text-sm rounded-md border border-gray-300"
                            aria-label="Nombre"
                            title="Nombre"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={editForm.lastName}
                            onChange={(e) => handleInputChange('lastName', e.target.value)}
                            className="p-1 w-full text-sm rounded-md border border-gray-300"
                            aria-label="Apellidos"
                            title="Apellidos"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={editForm.identifier}
                            onChange={(e) => handleInputChange('identifier', e.target.value)}
                            className="p-1 w-full text-sm rounded-md border border-gray-300"
                            aria-label="DNI/NIE"
                            title="DNI/NIE"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="email"
                            value={editForm.email || ''}
                            onChange={(e) => handleInputChange('email', e.target.value || null)}
                            className="p-1 w-full text-sm rounded-md border border-gray-300"
                            aria-label="Email"
                            title="Email"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="tel"
                            value={editForm.phone || ''}
                            onChange={(e) => handleInputChange('phone', e.target.value || null)}
                            className="p-1 w-full text-sm rounded-md border border-gray-300"
                            aria-label="Teléfono"
                            title="Teléfono"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={editForm.address || ''}
                            onChange={(e) => handleInputChange('address', e.target.value || null)}
                            className="p-1 w-full text-sm rounded-md border border-gray-300"
                            aria-label="Dirección"
                            title="Dirección"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={editForm.courseId}
                            onChange={(e) => {
                              const courseId = e.target.value;
                              handleInputChange('courseId', courseId);
                              handleInputChange('courseName', courseMap.get(courseId) || '');
                            }}
                            className="p-1 w-full text-sm rounded-md border border-gray-300"
                            aria-label="Curso"
                            title="Curso"
                          >
                            {courses.map(course => (
                              <option key={course.id} value={course.id}>
                                {course.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={editForm.instrumentId}
                            onChange={(e) => {
                              const instrumentId = e.target.value;
                              handleInputChange('instrumentId', instrumentId);
                              handleInputChange('instrumentName', instrumentMap.get(instrumentId) || '');
                            }}
                            className="p-1 w-full text-sm rounded-md border border-gray-300"
                            aria-label="Instrumento"
                            title="Instrumento"
                          >
                            {instruments.map(instrument => (
                              <option key={instrument.id} value={instrument.id}>
                                {instrument.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-500 whitespace-nowrap">
                          <div className="flex space-x-2">
                            <button
                              onClick={handleSaveEdit}
                              className="text-green-600 hover:text-green-900"
                              title="Guardar cambios"
                            >
                              <Save className="w-5 h-5" />
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="text-gray-600 hover:text-gray-900"
                              title="Cancelar edición"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      // Modo visualización
                      <>
                        <td className="px-3 py-2 text-sm text-gray-500 whitespace-nowrap">
                          {student.firstName}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-500 whitespace-nowrap">
                          {student.lastName}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-500 whitespace-nowrap">
                          {student.identifier}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-500 whitespace-nowrap">
                          {student.email || '-'}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-500 whitespace-nowrap">
                          {student.phone || '-'}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-500 whitespace-nowrap">
                          {student.address || '-'}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-500 whitespace-nowrap">
                          {courseMap.get(student.courseId) || student.courseName || '-'}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-500 whitespace-nowrap">
                          {instrumentMap.get(student.instrumentId) || student.instrumentName || '-'}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-500 whitespace-nowrap">
                          <button
                            onClick={() => handleEdit(index)}
                            className="text-indigo-600 hover:text-indigo-900"
                            title="Editar alumno"
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end mt-6 space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white rounded-md border border-gray-300 shadow-sm hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md border border-transparent shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Importar {students.length} alumnos
            </button>
          </div>
        </div>
      </div>
    </Dialog>
  );
} 
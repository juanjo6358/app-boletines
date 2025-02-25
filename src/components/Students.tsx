import { useState, useEffect } from 'react';
import { PlusCircle, Search, Pencil, Trash2 } from 'lucide-react';
import { BackButton } from './BackButton';
import { StudentDialog } from './students/StudentDialog';
import { ConfirmDialog } from './ConfirmDialog';
import { Student, Instrument, Level, Course } from '../types';
import { 
  getInstruments, 
  getLevels, 
  getCourses, 
  getStudents, 
  createStudent,
  updateStudent,
  deleteStudents 
} from '../lib/db/index';

export function Students() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showMultiDeleteConfirm, setShowMultiDeleteConfirm] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [studentsData, instrumentsData, levelsData, coursesData] = await Promise.all([
        getStudents(),
        getInstruments(),
        getLevels(),
        getCourses(),
      ]);
      setStudents(studentsData);
      setInstruments(instrumentsData);
      setLevels(levelsData);
      setCourses(coursesData);
    } catch (err) {
      setError('Error al cargar los datos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleAddStudent = async (newStudent: Omit<Student, 'id'>) => {
    try {
      const student = await createStudent(newStudent);
      setStudents(prev => [...prev, student]);
      setShowAddModal(false);
    } catch (err) {
      console.error('Error al crear estudiante:', err);
      // Aquí podrías mostrar un mensaje de error al usuario
    }
  };

  const handleEditStudent = async (id: string, studentData: Omit<Student, 'id'>) => {
    try {
      const updatedStudent = await updateStudent(id, studentData);
      setStudents(students.map(s => s.id === id ? updatedStudent : s));
      setEditingStudent(null);
    } catch (err) {
      console.error('Error al actualizar estudiante:', err);
    }
  };

  const handleDeleteSelected = async () => {
    try {
      await deleteStudents(Array.from(selectedStudents));
      setStudents(students.filter(s => !selectedStudents.has(s.id)));
      setSelectedStudents(new Set());
    } catch (err) {
      console.error('Error al eliminar estudiantes:', err);
    }
  };

  const toggleSelectAll = () => {
    if (selectedStudents.size === students.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(students.map(s => s.id)));
    }
  };

  const filteredStudents = students.filter((student) =>
    `${student.firstName} ${student.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <BackButton />
        </div>
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">Gestión de Alumnos</h1>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <PlusCircle className="h-5 w-5 mr-2" />
            Nuevo Alumno
          </button>
        </div>

        {/* Search Bar */}
        <div className="mt-6">
          <div className="relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 pr-12 sm:text-sm border-gray-300 rounded-md"
              placeholder="Buscar por nombre, curso o profesor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Students Table */}
        <div className="mt-8 flex flex-col">
          <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                {loading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                  </div>
                ) : error ? (
                  <div className="text-center text-red-600 p-4">
                    {error}
                    <button
                      onClick={loadData}
                      className="ml-2 text-indigo-600 hover:text-indigo-800"
                    >
                      Reintentar
                    </button>
                  </div>
                ) : (
                  <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="relative px-6 py-3">
                          <input
                            type="checkbox"
                            className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300"
                            checked={selectedStudents.size === students.length}
                            onChange={toggleSelectAll}
                            aria-label="Seleccionar todos los alumnos"
                          />
                        </th>
                        <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                          Nombre
                        </th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          Apellidos
                        </th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          Curso
                        </th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          Nivel
                        </th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          Instrumento
                        </th>
                        <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                          <span className="sr-only">Acciones</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {filteredStudents.map((student) => (
                        <tr key={student.id}>
                          <td className="relative px-6 py-4">
                            <input
                              type="checkbox"
                              className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300"
                              checked={selectedStudents.has(student.id)}
                              aria-label={`Seleccionar alumno ${student.firstName} ${student.lastName}`}
                              onChange={() => {
                                const newSelected = new Set(selectedStudents);
                                if (newSelected.has(student.id)) {
                                  newSelected.delete(student.id);
                                } else {
                                  newSelected.add(student.id);
                                }
                                setSelectedStudents(newSelected);
                              }}
                            />
                          </td>
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                            {student.firstName}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {student.lastName}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {student.courseName}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {student.levelName}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {student.instrumentName}
                          </td>
                          <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                            <button
                              onClick={() => setEditingStudent(student)}
                              className="text-indigo-600 hover:text-indigo-900 mr-4"
                              title="Editar alumno"
                            >
                              <Pencil className="h-5 w-5" />
                            </button>
                            <button
                              title="Eliminar alumno"
                              onClick={() => {
                                setSelectedStudents(new Set([student.id]));
                                setShowDeleteConfirm(true);
                              }}
                              className="text-red-600 hover:text-red-900"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>

        {selectedStudents.size > 0 && (
          <div className="fixed bottom-4 right-4 bg-white p-4 rounded-lg shadow-lg">
            <button
              onClick={() => setShowMultiDeleteConfirm(true)}
              className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              <Trash2 className="h-5 w-5 mr-2" />
              Eliminar seleccionados ({selectedStudents.size})
            </button>
          </div>
        )}

        <StudentDialog
          isOpen={showAddModal || !!editingStudent}
          onClose={() => {
            setShowAddModal(false);
            setEditingStudent(null);
          }}
          onSave={editingStudent ? 
            (data) => handleEditStudent(editingStudent.id, data) : 
            handleAddStudent
          }
          instruments={instruments}
          levels={levels}
          courses={courses}
          initialData={editingStudent || undefined}
        />

        <ConfirmDialog
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={handleDeleteSelected}
          title="Eliminar estudiante"
          message="¿Estás seguro de que quieres eliminar este estudiante? Esta acción no se puede deshacer."
        />

        <ConfirmDialog
          isOpen={showMultiDeleteConfirm}
          onClose={() => setShowMultiDeleteConfirm(false)}
          onConfirm={handleDeleteSelected}
          title="Eliminar estudiantes"
          message={`¿Estás seguro de que quieres eliminar ${selectedStudents.size} estudiantes? Esta acción no se puede deshacer.`}
        />
      </div>
    </div>
  );
}
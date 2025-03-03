import { useState, useEffect } from 'react';
import { PlusCircle, Search, Pencil, Trash2, FileUp, Filter } from 'lucide-react';
import { BackButton } from './BackButton';
import { StudentDialog } from './students/StudentDialog';
import { ConfirmDialog } from './ConfirmDialog';
import { ImportStudentsDialog } from './students/ImportStudentsDialog';
import { Student, Instrument, Level, Course } from '../types';
import { 
  getInstruments, 
  getLevels, 
  getCourses, 
  getStudents, 
  createStudent,
  updateStudent,
  deleteStudents,
  importStudents
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
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  
  // Estados para filtros
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [selectedLevel, setSelectedLevel] = useState<string>('');
  const [selectedInstrument, setSelectedInstrument] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

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
      setShowDeleteConfirm(false);
      setShowMultiDeleteConfirm(false);
    } catch (err) {
      console.error('Error al eliminar estudiantes:', err);
    }
  };

  const handleImportStudents = () => {
    setIsImportDialogOpen(true);
  };

  const handleImportSave = async (importedStudents: any[]) => {
    try {
      await importStudents(importedStudents);
      // Recargar la lista de estudiantes
      await loadData();
      setIsImportDialogOpen(false);
    } catch (error) {
      console.error('Error importing students:', error);
    }
  };

  const toggleSelectAll = () => {
    if (selectedStudents.size === filteredStudents.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(filteredStudents.map(s => s.id)));
    }
  };

  // Filtrar estudiantes según los criterios seleccionados
  const filteredStudents = students.filter((student) => {
    const matchesSearch = 
      searchTerm === '' || 
      `${student.firstName} ${student.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.identifier.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCourse = selectedCourse === '' || student.courseId === selectedCourse;
    const matchesLevel = selectedLevel === '' || 
      courses.find(c => c.id === student.courseId)?.levelId === selectedLevel;
    const matchesInstrument = selectedInstrument === '' || student.instrumentId === selectedInstrument;
    
    return matchesSearch && matchesCourse && matchesLevel && matchesInstrument;
  });

  return (
    <div className="py-6">
      <div className="px-4">
        <div className="mb-6">
          <BackButton />
        </div>
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">Gestión de Alumnos</h1>
          <div className="flex space-x-2">
            <button
              onClick={handleImportStudents}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md border border-transparent shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              <FileUp className="mr-2 w-5 h-5" />
              Importar
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md border border-transparent shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <PlusCircle className="mr-2 w-5 h-5" />
              Nuevo Alumno
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <div className="relative w-full max-w-md rounded-md shadow-sm">
              <div className="flex absolute inset-y-0 left-0 items-center pl-3 pointer-events-none">
                <Search className="w-5 h-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block pr-12 pl-10 w-full rounded-md border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Buscar por nombre o identificador..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center px-3 py-2 ml-4 text-sm font-medium leading-4 text-gray-700 bg-white rounded-md border border-gray-300 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <Filter className="mr-2 w-4 h-4" />
              Filtros
            </button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 gap-4 p-4 mb-4 bg-gray-50 rounded-md md:grid-cols-3">
              <div>
                <label htmlFor="level-filter" className="block mb-1 text-sm font-medium text-gray-700">Nivel</label>
                <select
                  id="level-filter"
                  value={selectedLevel}
                  onChange={(e) => setSelectedLevel(e.target.value)}
                  className="block px-3 py-2 w-full rounded-md border border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
                  aria-label="Filtrar por nivel"
                >
                  <option value="">Todos los niveles</option>
                  {levels.map(level => (
                    <option key={level.id} value={level.id}>{level.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="course-filter" className="block mb-1 text-sm font-medium text-gray-700">Curso</label>
                <select
                  id="course-filter"
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  className="block px-3 py-2 w-full rounded-md border border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
                  aria-label="Filtrar por curso"
                >
                  <option value="">Todos los cursos</option>
                  {courses
                    .filter(course => !selectedLevel || course.levelId === selectedLevel)
                    .map(course => {
                      const levelName = levels.find(l => l.id === course.levelId)?.name;
                      return (
                        <option key={course.id} value={course.id}>
                          {course.name} - {levelName}
                        </option>
                      );
                    })
                  }
                </select>
              </div>
              <div>
                <label htmlFor="instrument-filter" className="block mb-1 text-sm font-medium text-gray-700">Instrumento</label>
                <select
                  id="instrument-filter"
                  value={selectedInstrument}
                  onChange={(e) => setSelectedInstrument(e.target.value)}
                  className="block px-3 py-2 w-full rounded-md border border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
                  aria-label="Filtrar por instrumento"
                >
                  <option value="">Todos los instrumentos</option>
                  {instruments.map(instrument => (
                    <option key={instrument.id} value={instrument.id}>{instrument.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Students Table */}
        <div className="flex flex-col mt-8">
          <div className="overflow-x-auto -mx-4 -my-2 sm:-mx-6 lg:-mx-8">
            <div className="inline-block py-2 min-w-full align-middle md:px-6 lg:px-8">
              <div className="overflow-hidden ring-1 ring-black ring-opacity-5 shadow md:rounded-lg">
                {loading ? (
                  <div className="flex justify-center items-center h-64">
                    <div className="w-12 h-12 rounded-full border-b-2 border-indigo-600 animate-spin"></div>
                  </div>
                ) : error ? (
                  <div className="p-4 text-center text-red-600">
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
                            className="absolute left-4 top-1/2 -mt-2 w-4 h-4 rounded border-gray-300"
                            checked={selectedStudents.size === filteredStudents.length && filteredStudents.length > 0}
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
                          Email
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
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredStudents.map((student) => (
                        <tr key={student.id}>
                          <td className="relative px-6 py-4">
                            <input
                              type="checkbox"
                              className="absolute left-4 top-1/2 -mt-2 w-4 h-4 rounded border-gray-300"
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
                          <td className="py-4 pr-3 pl-4 text-sm font-medium text-gray-900 whitespace-nowrap sm:pl-6">
                            {student.firstName}
                          </td>
                          <td className="px-3 py-4 text-sm text-gray-500 whitespace-nowrap">
                            {student.lastName}
                          </td>
                          <td className="px-3 py-4 text-sm text-gray-500">
                            {student.email || '-'}
                          </td>
                          <td className="px-3 py-4 text-sm text-gray-500 whitespace-nowrap">
                            {student.courseName}
                          </td>
                          <td className="px-3 py-4 text-sm text-gray-500 whitespace-nowrap">
                            {student.levelName}
                          </td>
                          <td className="px-3 py-4 text-sm text-gray-500 whitespace-nowrap">
                            {student.instrumentName}
                          </td>
                          <td className="relative py-4 pr-4 pl-3 text-sm font-medium text-right whitespace-nowrap sm:pr-6">
                            <button
                              onClick={() => setEditingStudent(student)}
                              className="mr-4 text-indigo-600 hover:text-indigo-900"
                              title="Editar alumno"
                            >
                              <Pencil className="w-5 h-5" />
                            </button>
                            <button
                              title="Eliminar alumno"
                              onClick={() => {
                                setSelectedStudents(new Set([student.id]));
                                setShowDeleteConfirm(true);
                              }}
                              className="text-red-600 hover:text-red-900"
                            >
                              <Trash2 className="w-5 h-5" />
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
          <div className="fixed right-4 bottom-4 p-4 bg-white rounded-lg shadow-lg">
            <button
              onClick={() => setShowMultiDeleteConfirm(true)}
              className="inline-flex items-center px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700"
            >
              <Trash2 className="mr-2 w-5 h-5" />
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

        <ImportStudentsDialog
          isOpen={isImportDialogOpen}
          onClose={() => setIsImportDialogOpen(false)}
          onSave={handleImportSave}
          courses={courses}
          instruments={instruments}
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
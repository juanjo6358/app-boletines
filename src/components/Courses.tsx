import { useState, useEffect } from 'react';
import { BackButton } from './BackButton';
import { Course, Level, Student, Instrument, CourseTemplate } from '../types';
import { 
  getCourses, 
  getLevels, 
  getStudentsByCourse, 
  getInstruments,
  getCourseTemplates,
  createCourse,
  updateCourse,
  deleteCourse
} from '../lib/db/index';
import { BookOpen, ChevronDown, ChevronRight, GraduationCap, Music, Plus, Pencil, Trash2 } from 'lucide-react';
import { ConfirmDialog } from './ConfirmDialog';

interface CourseWithStudents extends Course {
  students: Student[];
}

export function Courses() {
  const [courses, setCourses] = useState<CourseWithStudents[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [expandedLevels, setExpandedLevels] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedInstrumentId, setSelectedInstrumentId] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['levels']));
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  
  const [templates, setTemplates] = useState<CourseTemplate[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Course | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    levelId: '',
    academicYear: '',
    templateId: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [coursesData, levelsData, instrumentsData, templatesData] = await Promise.all([
        getCourses(),
        getLevels(),
        getInstruments(),
        getCourseTemplates()
      ]);

      // Cargar estudiantes para cada curso
      const coursesWithStudents = await Promise.all(
        coursesData.map(async (course) => {
          const students = await getStudentsByCourse(course.id);
          return { ...course, students } as CourseWithStudents;
        })
      );

      setCourses(coursesWithStudents);
      setLevels(levelsData);
      setInstruments(instrumentsData);
      setTemplates(templatesData);
      
      if (levelsData.length > 0) {
        setExpandedLevels(new Set([levelsData[0].id]));
      }
    } catch (err) {
      setError('Error al cargar los datos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.levelId || !formData.academicYear) {
      setError('Por favor, completa todos los campos obligatorios');
      return;
    }

    try {
      if (editingId) {
        await updateCourse(
          editingId,
          formData.name,
          formData.levelId,
          formData.academicYear,
          formData.templateId || null
        );
      } else {
        await createCourse(
          formData.name,
          formData.levelId,
          formData.academicYear,
          formData.templateId || null
        );
      }
      
      await loadData();
      setIsAdding(false);
      setEditingId(null);
      setFormData({ name: '', levelId: '', academicYear: '', templateId: '' });
    } catch (error) {
      console.error('Error:', error);
      setError('Error al guardar el curso');
    }
  };

  const coursesByLevel = courses.reduce<Record<string, CourseWithStudents[]>>((acc, course) => {
    if (!acc[course.levelId]) {
      acc[course.levelId] = [];
    }
    acc[course.levelId].push(course);
    return acc;
  }, {});

  const selectedCourse = courses.find(course => course.id === selectedCourseId);
  const selectedLevel = levels.find(level => level.id === selectedCourse?.levelId);

  // Agrupar estudiantes por instrumento
  const studentsByInstrument = courses.flatMap(course => course.students)
    .reduce<Record<string, Student[]>>((acc, student) => {
      if (!acc[student.instrumentId]) {
        acc[student.instrumentId] = [];
      }
      acc[student.instrumentId].push(student);
      return acc;
    }, {});

  const selectedInstrument = instruments.find(i => i.id === selectedInstrumentId);
  const studentsForSelectedInstrument = selectedInstrumentId 
    ? courses.flatMap(c => c.students).filter(s => s.instrumentId === selectedInstrumentId)
    : [];

  // Cuando se selecciona un curso, mostrar el formulario de edición
  const handleCourseSelect = (course: CourseWithStudents) => {
    setSelectedCourseId(course.id);
    setIsAdding(false);
    setEditingId(course.id);
    setFormData({
      name: course.name,
      levelId: course.levelId,
      academicYear: course.academicYear,
      templateId: course.templateId || ''
    });
  };

  return (
    <div className="py-6">
      <div className="px-4">
        <div className="flex justify-between items-center mb-6">
          <BackButton />
          <button
            onClick={() => {
              setIsAdding(true);
              setEditingId(null);
              setFormData({ name: '', levelId: '', academicYear: '', templateId: '' });
            }}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md border border-transparent shadow-sm hover:bg-indigo-700"
          >
            <Plus className="mr-2 w-4 h-4" />
            Añadir Curso
          </button>
        </div>

        {(isAdding || editingId) && (
          <form onSubmit={handleSubmit} className="p-6 mb-6 bg-white rounded-lg shadow">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Nombre del Curso
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="block mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label htmlFor="level-select" className="block text-sm font-medium text-gray-700">
                  Nivel
                </label>
                <select
                  id="level-select"
                  value={formData.levelId}
                  onChange={(e) => setFormData(prev => ({ ...prev, levelId: e.target.value }))}
                  className="block mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="">Selecciona un nivel...</option>
                  {levels.map(level => (
                    <option key={level.id} value={level.id}>
                      {level.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="academic-year" className="block text-sm font-medium text-gray-700">
                  Año Académico
                </label>
                <input
                  type="text"
                  id="academic-year"
                  value={formData.academicYear}
                  onChange={(e) => setFormData(prev => ({ ...prev, academicYear: e.target.value }))}
                  className="block mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label htmlFor="template-select" className="block text-sm font-medium text-gray-700">
                  Plantilla
                </label>
                <select
                  id="template-select"
                  value={formData.templateId}
                  onChange={(e) => setFormData(prev => ({ ...prev, templateId: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="">Sin plantilla</option>
                  {templates
                    .filter(t => t.levelId === formData.levelId)
                    .map(template => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end mt-4 space-x-2">
              <button
                type="button"
                onClick={() => {
                  setIsAdding(false);
                  setEditingId(null);
                  setFormData({ name: '', levelId: '', academicYear: '', templateId: '' });
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white rounded-md border border-gray-300 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md border border-transparent hover:bg-indigo-700"
              >
                {editingId ? 'Guardar Cambios' : 'Crear Curso'}
              </button>
            </div>
          </form>
        )}

        <div className="flex gap-6">
          {/* Menú Lateral con Acordeones */}
          <div className="w-64 shrink-0">
            <h2 className="mb-6 text-xl font-medium text-gray-900">Niveles e instrumentos</h2>
            <nav className="space-y-2">
              {/* Sección de Niveles (sin acordeón en el título) */}
              <div className="space-y-2">
                {levels.map(level => (
                  <div key={level.id} className="overflow-hidden rounded-md">
                    <button
                      onClick={() => {
                        const newExpandedLevels = new Set(expandedLevels);
                        if (expandedLevels.has(level.id)) {
                          newExpandedLevels.delete(level.id);
                        } else {
                          newExpandedLevels.add(level.id);
                        }
                        setExpandedLevels(newExpandedLevels);
                      }}
                      className="flex items-center px-3 py-2 w-full text-sm font-medium text-gray-900 bg-gray-50 hover:bg-gray-100"
                    >
                      <span className="flex items-center">
                        {expandedLevels.has(level.id) ? (
                          <ChevronDown className="mr-2 w-4 h-4" />
                        ) : (
                          <ChevronRight className="mr-2 w-4 h-4" />
                        )}
                        <GraduationCap className="mr-2 w-4 h-4" />
                        {level.name}
                      </span>
                    </button>

                    {expandedLevels.has(level.id) && coursesByLevel[level.id] && (
                      <div className="ml-4 border-l border-gray-200">
                        {coursesByLevel[level.id].map(course => (
                          <button
                            key={course.id}
                            onClick={() => handleCourseSelect(course)}
                            className={`
                              w-full flex items-center justify-between px-3 py-2 text-sm
                              ${selectedCourseId === course.id
                                ? 'bg-indigo-50 text-indigo-700'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                              }
                            `}
                          >
                            <span className="flex items-center">
                              <BookOpen className="mr-2 w-4 h-4" />
                              {course.name}
                            </span>
                            <span className="text-xs text-gray-500">
                              {course.students.length} alumnos
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Acordeón de Instrumentos */}
              <div className="overflow-hidden rounded-md">
                <button
                  onClick={() => {
                    const newExpandedSections = new Set(expandedSections);
                    if (expandedSections.has('instruments')) {
                      newExpandedSections.delete('instruments');
                    } else {
                      newExpandedSections.add('instruments');
                    }
                    setExpandedSections(newExpandedSections);
                  }}
                  className="flex items-center px-3 py-2 w-full text-sm font-medium text-gray-900 bg-gray-50 hover:bg-gray-100"
                >
                  <span className="flex items-center">
                    {expandedSections.has('instruments') ? (
                      <ChevronDown className="mr-2 w-4 h-4" />
                    ) : (
                      <ChevronRight className="mr-2 w-4 h-4" />
                    )}
                    <Music className="mr-2 w-4 h-4" />
                    Instrumentos
                  </span>
                </button>

                {expandedSections.has('instruments') && (
                  <div className="mt-2 ml-4 border-l border-gray-200">
                    {instruments.map(instrument => (
                      <button
                        key={instrument.id}
                        onClick={() => setSelectedInstrumentId(instrument.id)}
                        className={`
                          w-full flex items-center justify-between px-3 py-2 text-sm
                          ${selectedInstrumentId === instrument.id
                            ? 'bg-indigo-50 text-indigo-700'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                          }
                        `}
                      >
                        <span className="flex items-center">
                          <Music className="mr-2 w-4 h-4" />
                          {instrument.name}
                        </span>
                        <span className="text-xs text-gray-500">
                          {studentsByInstrument[instrument.id]?.length || 0} alumnos
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </nav>
          </div>

          {/* Contenido Principal */}
          <div className="flex-1">
            {selectedCourse ? (
              <>
                {/* Encabezado fuera del contenedor */}
                <div className="mb-6">
                  <h2 className="text-2xl font-medium text-gray-900">{selectedCourse.name}</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Nivel: {selectedLevel?.name} • {selectedCourse.students.length} {selectedCourse.students.length === 1 ? 'alumno' : 'alumnos'}
                  </p>
                </div>

                {/* Contenedor con la tabla */}
                <div className="p-6 bg-white rounded-lg shadow">
                  <h3 className="mb-4 text-lg font-medium text-gray-900">Alumnos</h3>
                  <div className="overflow-hidden ring-1 ring-black ring-opacity-5 shadow md:rounded-lg">
                    <table className="min-w-full divide-y divide-gray-300">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                            Nombre
                          </th>
                          <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                            Apellidos
                          </th>
                          <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                            Instrumento
                          </th>
                          <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                            Identificador
                          </th>
                          <th scope="col" className="px-6 py-3.5 text-right text-sm font-semibold text-gray-900">
                            Acciones
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {selectedCourse.students.length > 0 ? (
                          selectedCourse.students.map(student => (
                            <tr key={student.id}>
                              <td className="py-4 pr-3 pl-4 text-sm font-medium text-gray-900 whitespace-nowrap sm:pl-6">
                                {student.firstName}
                              </td>
                              <td className="px-3 py-4 text-sm text-gray-500 whitespace-nowrap">
                                {student.lastName}
                              </td>
                              <td className="px-3 py-4 text-sm text-gray-500 whitespace-nowrap">
                                {student.instrumentName}
                              </td>
                              <td className="px-3 py-4 text-sm text-gray-500 whitespace-nowrap">
                                {student.identifier}
                              </td>
                              <td className="px-6 py-4 text-sm font-medium text-right whitespace-nowrap">
                                <button
                                  onClick={() => {
                                    setIsAdding(false);
                                    setEditingId(student.courseId);
                                    const course = courses.find(c => c.id === student.courseId);
                                    if (course) {
                                      setFormData({
                                        name: course.name || '',
                                        levelId: course.levelId,
                                        academicYear: course.academicYear,
                                        templateId: course.templateId || ''
                                      });
                                    }
                                  }}
                                  className="inline-flex items-center mr-2 text-indigo-600 hover:text-indigo-900"
                                >
                                  <Pencil className="mr-1 w-4 h-4" />
                                  Editar
                                </button>
                                <button
                                  onClick={() => {
                                    const course = courses.find(c => c.id === student.courseId);
                                    if (course) {
                                      setDeleteConfirm(course);
                                    }
                                  }}
                                  className="inline-flex items-center text-red-600 hover:text-red-900"
                                >
                                  <Trash2 className="mr-1 w-4 h-4" />
                                  Eliminar
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="py-4 text-sm text-center text-gray-500">
                              No hay alumnos en este curso
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : selectedInstrument ? (
              <>
                {/* Encabezado para instrumento */}
                <div className="mb-6">
                  <h2 className="text-2xl font-medium text-gray-900">{selectedInstrument.name}</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    {studentsForSelectedInstrument.length} {studentsForSelectedInstrument.length === 1 ? 'alumno' : 'alumnos'}
                  </p>
                </div>

                {/* Tabla de alumnos del instrumento */}
                <div className="p-6 bg-white rounded-lg shadow">
                  <h3 className="mb-4 text-lg font-medium text-gray-900">Alumnos</h3>
                  <div className="overflow-hidden ring-1 ring-black ring-opacity-5 shadow md:rounded-lg">
                    <table className="min-w-full divide-y divide-gray-300">
                      <thead className="bg-gray-50">
                        <tr>
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
                            Identificador
                          </th>
                          <th scope="col" className="px-6 py-3.5 text-right text-sm font-semibold text-gray-900">
                            Acciones
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {studentsForSelectedInstrument.length > 0 ? (
                          studentsForSelectedInstrument.map(student => (
                            <tr key={student.id}>
                              <td className="py-4 pr-3 pl-4 text-sm font-medium text-gray-900 whitespace-nowrap sm:pl-6">
                                {student.firstName}
                              </td>
                              <td className="px-3 py-4 text-sm text-gray-500 whitespace-nowrap">
                                {student.lastName}
                              </td>
                              <td className="px-3 py-4 text-sm text-gray-500 whitespace-nowrap">
                                {student.courseName}
                              </td>
                              <td className="px-3 py-4 text-sm text-gray-500 whitespace-nowrap">
                                {student.identifier}
                              </td>
                              <td className="px-6 py-4 text-sm font-medium text-right whitespace-nowrap">
                                <button
                                  onClick={() => {
                                    setIsAdding(false);
                                    setEditingId(student.courseId);
                                    const course = courses.find(c => c.id === student.courseId);
                                    if (course) {
                                      setFormData({
                                        name: course.name || '',
                                        levelId: course.levelId,
                                        academicYear: course.academicYear,
                                        templateId: course.templateId || ''
                                      });
                                    }
                                  }}
                                  className="inline-flex items-center mr-2 text-indigo-600 hover:text-indigo-900"
                                >
                                  <Pencil className="mr-1 w-4 h-4" />
                                  Editar
                                </button>
                                <button
                                  onClick={() => {
                                    const course = courses.find(c => c.id === student.courseId);
                                    if (course) {
                                      setDeleteConfirm(course);
                                    }
                                  }}
                                  className="inline-flex items-center text-red-600 hover:text-red-900"
                                >
                                  <Trash2 className="mr-1 w-4 h-4" />
                                  Eliminar
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="py-4 text-sm text-center text-gray-500">
                              No hay alumnos para este instrumento
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-6 text-center text-gray-500 bg-white rounded-lg shadow">
                Selecciona un curso o instrumento para ver sus detalles
              </div>
            )}
          </div>
        </div>

        {/* Indicadores de Estado */}
        {loading && (
          <div className="flex fixed inset-0 justify-center items-center bg-gray-500 bg-opacity-75">
            <div className="p-6 bg-white rounded-lg shadow-xl">
              <div className="mx-auto w-12 h-12 rounded-full border-b-2 border-indigo-600 animate-spin"></div>
              <p className="mt-4 text-gray-600">Cargando...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex fixed inset-0 justify-center items-center bg-red-50 bg-opacity-75">
            <div className="p-6 text-center bg-white rounded-lg shadow-xl">
              <p className="text-xl text-red-600">{error}</p>
              <button 
                onClick={loadData}
                className="px-4 py-2 mt-4 text-white bg-indigo-600 rounded hover:bg-indigo-700"
              >
                Reintentar
              </button>
            </div>
          </div>
        )}

        {/* Diálogo de confirmación para eliminar */}
        <ConfirmDialog
          isOpen={!!deleteConfirm}
          onClose={() => setDeleteConfirm(null)}
          onConfirm={async () => {
            if (deleteConfirm) {
              try {
                await deleteCourse(deleteConfirm.id);
                await loadData();
                setDeleteConfirm(null);
              } catch (error) {
                console.error('Error al eliminar el curso:', error);
                setError('Error al eliminar el curso');
              }
            }
          }}
          title="Eliminar Curso"
          message={`¿Estás seguro de que quieres eliminar el curso "${deleteConfirm?.name}"?`}
        />
      </div>
    </div>
  );
}
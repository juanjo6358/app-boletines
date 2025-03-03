import { useState, useEffect } from 'react';
import { PlusCircle, Search, Pencil, Trash2 } from 'lucide-react';
import { BackButton } from './BackButton';
import { TeacherDialog } from './teachers/TeacherDialog';
import type { Teacher, Instrument, Course } from '../types';
import { getTeachers, getCourses, getInstruments, createTeacher, updateTeacher, deleteTeacher, getLevels, assignTeacherSubjects } from '../lib/db/index';

type CourseWithLevel = Course & { levelName: string };

export function Teachers() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [courses, setCourses] = useState<CourseWithLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [teachersData, instrumentsData, coursesData, levelsData] = await Promise.all([
        getTeachers(),
        getInstruments(),
        getCourses(),
        getLevels(),
      ]);

      // Añadir el nombre del nivel a cada curso
      const coursesWithLevels = coursesData.map(course => {
        const levelName = levelsData.find(level => level.id === course.levelId)?.name || 'Sin nivel';
        return {
          ...course,
          levelName
        };
      });

      setTeachers(teachersData);
      setInstruments(instrumentsData);
      setCourses(coursesWithLevels);
    } catch (err) {
      setError('Error al cargar los datos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleSaveTeacher = async (teacherData: Omit<Teacher, 'id'>): Promise<Teacher> => {
    try {
      let savedTeacher: Teacher;
      
      if (editingTeacher) {
        await updateTeacher(
          editingTeacher.id, 
          teacherData,
          teacherData.courseIds
        );
        savedTeacher = { ...teacherData, id: editingTeacher.id };
      } else {
        savedTeacher = await createTeacher(
          teacherData,
          teacherData.courseIds
        );
      }

      // Asignar asignaturas después de crear/actualizar
      if (teacherData.courseSubjects) {
        for (const courseId of teacherData.courseIds) {
          const courseSubjects = teacherData.courseSubjects[courseId];
          if (courseSubjects?.length > 0) {
            await assignTeacherSubjects(
              savedTeacher.id,
              courseId,
              courseSubjects
            );
          }
        }
      }

      const updatedTeachers = await getTeachers();
      setTeachers(updatedTeachers);
      setShowDialog(false);
      setEditingTeacher(null);
      
      return savedTeacher;
    } catch (err) {
      console.error('Error al guardar profesor:', err);
      setError('Error al guardar el profesor');
      throw err;
    }
  };

  const handleEditTeacher = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setShowDialog(true);
  };

  const handleDeleteTeacher = async (id: string) => {
    try {
      await deleteTeacher(id);
      setTeachers(teachers.filter(t => t.id !== id));
    } catch (err) {
      console.error('Error al eliminar profesor:', err);
      setError('Error al eliminar el profesor');
    }
  };

  return (
    <div className="py-6">
      <div className="px-4">
        <div className="mb-6">
          <BackButton />
        </div>
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">Gestión de Profesores</h1>
          <button
            onClick={() => setShowDialog(true)}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md border border-transparent shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <PlusCircle className="mr-2 w-5 h-5" />
            Nuevo Profesor
          </button>
        </div>

        {/* Barra de búsqueda */}
        <div className="mt-6">
          <div className="relative rounded-md shadow-sm">
            <div className="flex absolute inset-y-0 left-0 items-center pl-3 pointer-events-none">
              <Search className="w-5 h-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block pr-12 pl-10 w-full rounded-md border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Buscar profesor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Tabla de Profesores (placeholder) */}
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
                        <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                          Nombre
                        </th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          Email
                        </th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          Especialidad
                        </th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          Asignaturas
                        </th>
                        <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                          <span className="sr-only">Acciones</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {teachers.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-4 text-sm text-center text-gray-500">
                            No hay profesores registrados
                          </td>
                        </tr>
                      ) : (
                        teachers.map((teacher) => (
                          <tr key={teacher.id}>
                            <td className="py-4 pr-3 pl-4 text-sm font-medium text-gray-900 whitespace-nowrap sm:pl-6">
                              {teacher.firstName} {teacher.lastName}
                            </td>
                            <td className="px-3 py-4 text-sm text-gray-500 whitespace-nowrap">
                              {teacher.email}
                            </td>
                            <td className="px-3 py-4 text-sm text-gray-500 whitespace-nowrap">
                              {teacher.instrumentName}
                            </td>
                            <td className="px-3 py-4 text-sm text-gray-500">
                              <div className="flex flex-wrap gap-2">
                                {teacher.courseNames?.map((course, index) => (
                                  <span 
                                    key={index}
                                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800"
                                  >
                                    {course}
                                  </span>
                                )) || (
                                  <span className="italic text-gray-400">Sin asignaturas</span>
                                )}
                              </div>
                            </td>
                            <td className="relative py-4 pr-4 pl-3 text-sm font-medium text-right whitespace-nowrap sm:pr-6">
                              <button
                                onClick={() => handleEditTeacher(teacher)}
                                className="mr-2 text-indigo-600 hover:text-indigo-900"
                                title="Editar profesor"
                              >
                                <Pencil className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => handleDeleteTeacher(teacher.id)}
                                className="text-red-600 hover:text-red-900"
                                title="Eliminar profesor"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>

        <TeacherDialog
          isOpen={showDialog}
          onClose={() => {
            setShowDialog(false);
            setEditingTeacher(null);
          }}
          onSave={handleSaveTeacher}
          instruments={instruments}
          courses={courses}
          initialData={editingTeacher || undefined}
        />
      </div>
    </div>
  );
} 
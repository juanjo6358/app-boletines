// Nueva vista para gestionar las asignaturas de los profesores 
import { useState, useEffect } from 'react';
import { BackButton } from './BackButton';
import { Teacher, CourseTemplate, Course } from '../types';
import { getTeachers, getCourseTemplates, getCourses, assignTeacherSubjects } from '../lib/db/index';
import { Listbox, Transition } from '@headlessui/react';
import { Check, ChevronsUpDown, PlusCircle } from 'lucide-react';

export function TeacherSubjects() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [templates, setTemplates] = useState<CourseTemplate[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAllSubjects, setShowAllSubjects] = useState<{[courseId: string]: boolean}>({});
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [teachersData, templatesData, coursesData] = await Promise.all([
        getTeachers(),
        getCourseTemplates(),
        getCourses()
      ]);

      console.log('Loaded data:', {
        teachers: teachersData,
        templates: templatesData,
        courses: coursesData
      });

      setTeachers(teachersData);
      setTemplates(templatesData);
      setCourses(coursesData);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  }

  const handleSaveSubjects = async (
    teacherId: string,
    courseId: string,
    subjects: Array<{name: string, type: 'individual' | 'group'}>
  ) => {
    try {
      setIsUpdating(true);
      await assignTeacherSubjects(teacherId, courseId, subjects);
      
      // Actualizar el estado local en lugar de recargar todos los datos
      setTeachers(prevTeachers => prevTeachers.map(teacher => {
        if (teacher.id === teacherId) {
          return {
            ...teacher,
            courseSubjects: {
              ...teacher.courseSubjects,
              [courseId]: subjects
            }
          };
        }
        return teacher;
      }));
    } catch (err) {
      console.error('Error saving subjects:', err);
      setError('Error al guardar las asignaturas');
    } finally {
      setIsUpdating(false);
    }
  };

  const selectedTeacherData = teachers.find(t => t.id === selectedTeacher);

  return (
    <div className="py-6">
      <div className="px-4">
        <div className="mb-6">
          <BackButton />
        </div>
        
        <h1 className="mb-6 text-2xl font-semibold text-gray-900">
          Gestión de Asignaturas del Profesorado
        </h1>

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
          <div className="space-y-6">
            {/* Selector de Profesor mejorado */}
            <div className="max-w-xl">
              <Listbox value={selectedTeacher} onChange={setSelectedTeacher}>
                <div className="relative mt-1">
                  <Listbox.Button className="relative py-2 pr-10 pl-3 w-full text-left bg-white rounded-lg border border-gray-300 cursor-default focus:outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-300 sm:text-sm">
                    <span className="block truncate">
                      {selectedTeacherData 
                        ? `${selectedTeacherData.firstName} ${selectedTeacherData.lastName} - ${selectedTeacherData.instrumentName}`
                        : 'Seleccione un profesor...'}
                    </span>
                    <span className="flex absolute inset-y-0 right-0 items-center pr-2 pointer-events-none">
                      <ChevronsUpDown className="w-5 h-5 text-gray-400" aria-hidden="true" />
                    </span>
                  </Listbox.Button>
                  <Transition
                    leave="transition ease-in duration-100"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                  >
                    <Listbox.Options className="overflow-auto absolute py-1 mt-1 w-full max-h-60 text-base bg-white rounded-md ring-1 ring-black ring-opacity-5 shadow-lg focus:outline-none sm:text-sm">
                      {teachers.map((teacher) => (
                        <Listbox.Option
                          key={teacher.id}
                          value={teacher.id}
                          className={({ active }) => `
                            relative cursor-default select-none py-2 pl-10 pr-4
                            ${active ? 'bg-indigo-100 text-indigo-900' : 'text-gray-900'}
                          `}
                        >
                          {({ selected }) => (
                            <>
                              <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                                {teacher.firstName} {teacher.lastName} - {teacher.instrumentName}
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

            {/* Mostrar cursos y asignaturas del profesor seleccionado */}
            {selectedTeacherData && (
              <div className="mt-6 space-y-6">
                {selectedTeacherData.courseIds.map(courseId => {
                  const course = courses.find(c => c.id === courseId);
                  const template = templates.find(t => t.name === course?.name);

                  console.log('Debugging course and template:', {
                    courseId,
                    courseName: course?.name,
                    courseLevelId: course?.levelId,
                    templateName: template?.name,
                    allTemplateNames: templates.map(t => t.name),
                    templateSubjects: template?.subjects.map(s => ({
                      name: s.name,
                      type: s.type,
                      isRequired: s.isRequired
                    }))
                  });

                  const assignedSubjects = selectedTeacherData.courseSubjects?.[courseId] || [];
                  const showAll = showAllSubjects[courseId];

                  // Si no hay plantilla, mostrar mensaje de error
                  if (!template) {
                    return (
                      <div key={courseId} className="p-6 bg-white rounded-lg border border-red-200">
                        <h3 className="mb-4 text-lg font-medium text-gray-900">
                          {course?.name}
                          <span className="ml-2 text-sm text-red-600">
                            (Error: No se encontró la plantilla para el nivel {course?.levelId})
                          </span>
                        </h3>
                      </div>
                    );
                  }

                  return (
                    <div key={courseId} className="p-6 bg-white rounded-lg border shadow-sm">
                      <h3 className="mb-4 text-lg font-medium text-gray-900">
                        {course?.name}
                        <span className="ml-2 text-sm text-gray-500">
                          (Nivel: {template.levelName})
                        </span>
                      </h3>

                      {/* Asignaturas asignadas */}
                      <div className="space-y-3">
                        {assignedSubjects.map(subject => (
                          <label 
                            key={subject.name} 
                            className="flex items-center"
                          >
                            <input
                              type="checkbox"
                              checked={true}
                              disabled={isUpdating}
                              onChange={() => {
                                const newSubjects = assignedSubjects.filter(
                                  s => s.name !== subject.name
                                );
                                handleSaveSubjects(
                                  selectedTeacherData.id, 
                                  courseId, 
                                  newSubjects
                                );
                              }}
                              className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                            />
                            <span className="ml-2 text-sm text-gray-900">
                              {subject.name}
                            </span>
                          </label>
                        ))}
                      </div>

                      {/* Botón para mostrar todas las asignaturas disponibles */}
                      <button
                        onClick={() => setShowAllSubjects(prev => ({...prev, [courseId]: !prev[courseId]}))}
                        className="inline-flex items-center mt-4 text-sm text-indigo-600 hover:text-indigo-800"
                      >
                        <PlusCircle className="mr-1 w-4 h-4" />
                        {showAll ? 'Ocultar asignaturas disponibles' : 'Añadir más asignaturas'}
                      </button>

                      {/* Lista de asignaturas disponibles */}
                      {showAll && (
                        <div className="pl-4 mt-4 space-y-3 border-l-2 border-indigo-100">
                          {template?.subjects
                            .filter(subject => !assignedSubjects.some(s => s.name === subject.name))
                            .map(subject => {
                              // Log para ver qué asignaturas se están filtrando
                              console.log('Subject being filtered:', {
                                subjectName: subject.name,
                                subjectType: subject.type,
                                isFiltered: assignedSubjects.some(s => s.name === subject.name),
                                assignedSubjectsNames: assignedSubjects.map(s => s.name)
                              });

                              return (
                                <label 
                                  key={subject.id} 
                                  className="flex items-center"
                                >
                                  <input
                                    type="checkbox"
                                    checked={false}
                                    disabled={isUpdating}
                                    onChange={() => {
                                      const newSubjects = [
                                        ...assignedSubjects,
                                        { name: subject.name, type: subject.type }
                                      ];
                                      handleSaveSubjects(
                                        selectedTeacherData.id, 
                                        courseId, 
                                        newSubjects
                                      );
                                    }}
                                    className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                                  />
                                  <span className="ml-2 text-sm text-gray-900">
                                    {subject.name}
                                  </span>
                                </label>
                              );
                            })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 
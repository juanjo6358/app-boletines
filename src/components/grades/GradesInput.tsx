import { useState, useEffect, Fragment } from 'react';
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { BackButton } from '../BackButton';
import { getCourses, getStudents, getReportCard, getStudentGrades, saveStudentGrades, getCenterConfig, getEvaluationCriteria, verifyTemplateAssignment } from '../../lib/db';
import { Course, Student, Section, ReportCardState, Field, EvaluationCriterion } from '../../types';
import { Listbox, Transition } from '@headlessui/react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { RichTextEditor } from '../common/RichTextEditor';

interface StudentsByLevel {
  [levelId: string]: {
    levelName: string | undefined;
    courses: {
      [courseId: string]: {
        courseName: string;
        students: Student[];
      };
    };
  };
}

interface GradeData {
  attendance: string;
  global: string;
  criteria: { [fieldId: string]: string };
  observations?: string;
}

interface Grades {
  [sectionId: string]: GradeData;
}

interface AdditionalCriterion {
  sectionId: string;
  fields: Field[];
}

// Añadir el componente ConfirmationModal
interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const ConfirmationModal = ({ isOpen, onClose, onConfirm }: ConfirmationModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="overflow-y-auto fixed inset-0 z-50">
      <div className="flex justify-center items-end p-4 min-h-full text-center sm:items-center sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>

        <div className="overflow-hidden relative text-left bg-white rounded-lg shadow-xl transition-all transform sm:my-8 sm:w-full sm:max-w-lg">
          <div className="px-4 pt-5 pb-4 bg-white sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="flex flex-shrink-0 justify-center items-center mx-auto w-12 h-12 bg-amber-100 rounded-full sm:mx-0 sm:h-10 sm:w-10">
                <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                <h3 className="text-base font-semibold leading-6 text-gray-900">
                  Cambios sin guardar
                </h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">
                    ¿Deseas guardar los cambios antes de cambiar de alumno?
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="px-4 py-3 bg-gray-50 sm:flex sm:flex-row-reverse sm:px-6">
            <button
              type="button"
              onClick={onConfirm}
              className="inline-flex justify-center px-3 py-2 w-full text-sm font-semibold text-white bg-indigo-600 rounded-md shadow-sm hover:bg-indigo-500 sm:ml-3 sm:w-auto"
            >
              Guardar cambios
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex justify-center px-3 py-2 mt-3 w-full text-sm font-semibold text-gray-900 bg-white rounded-md ring-1 ring-inset ring-gray-300 shadow-sm hover:bg-gray-50 sm:mt-0 sm:w-auto"
            >
              Descartar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Añadir la interfaz GradeSelectProps al inicio del archivo junto con las otras interfaces
interface GradeSelectProps {
  currentValue: string;
  onChange: (value: string) => void;
  evaluationCriteria: EvaluationCriterion[];
}

export function GradesInput() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [reportCard, setReportCard] = useState<ReportCardState | null>(null);
  const [grades, setGrades] = useState<Grades>({});
  const [centerConfig, setCenterConfig] = useState<{name: string; logo?: string} | null>(null);
  const [isAddingCriterion, setIsAddingCriterion] = useState(false);
  const [newCriterionName, setNewCriterionName] = useState('');
  const [isEditingCriteria, setIsEditingCriteria] = useState(false);
  const [localGrades, setLocalGrades] = useState<Grades>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'unsaved' | 'saving' | 'saved'>('saved');
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
  const [pendingStudentChange, setPendingStudentChange] = useState<Student | null>(null);
  const [evaluationCriteria, setEvaluationCriteria] = useState<EvaluationCriterion[]>([]);
  const [addingSectionId, setAddingSectionId] = useState<string | null>(null);

  // Organizar estudiantes por nivel y curso
  const studentsByLevel = students.reduce((acc: StudentsByLevel, student) => {
    const course = courses.find(c => c.id === student.courseId);
    if (!course) return acc;

    if (!acc[course.levelId]) {
      acc[course.levelId] = {
        levelName: course.levelName || 'Sin nivel',
        courses: {}
      };
    }

    if (!acc[course.levelId].courses[course.id]) {
      acc[course.levelId].courses[course.id] = {
        courseName: course.name,
        students: []
      };
    }

    acc[course.levelId].courses[course.id].students.push(student);
    return acc;
  }, {});

  useEffect(() => {
    const loadData = async () => {
      try {
        const [coursesData, studentsData] = await Promise.all([
          getCourses(),
          getStudents()
        ]);
        setCourses(coursesData);
        setStudents(studentsData);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Modificar el useEffect y loadReportCardData
  useEffect(() => {
    let isMounted = true;

    const loadReportCardData = async () => {
      if (!selectedStudent) return;

      try {
        console.log('Cargando boletín para el curso:', selectedStudent);
        
        // Cargar el boletín primero
        const data = await getReportCard(selectedStudent.courseId);
        
        if (data && isMounted) {
          console.log('Datos del boletín cargados:', data);
          
          // Cargar las calificaciones existentes
          const studentGrades = await getStudentGrades(selectedStudent.id, selectedStudent.courseId);
          
          // Si hay criterios adicionales, añadirlos al boletín
          if (studentGrades && studentGrades.additionalCriteria && studentGrades.additionalCriteria.length > 0) {
            console.log('Criterios adicionales encontrados:', studentGrades.additionalCriteria);
            
            // Crear una copia del boletín para modificarlo
            const updatedReportCard = { ...data };
            
            // Añadir los criterios adicionales a las secciones correspondientes
            studentGrades.additionalCriteria.forEach((criterion: AdditionalCriterion) => {
              const sectionIndex = updatedReportCard.sections.findIndex(s => s.id === criterion.sectionId);
              if (sectionIndex !== -1) {
                // Filtrar los campos existentes para no duplicar criterios
                const existingFieldIds = new Set(updatedReportCard.sections[sectionIndex].fields.map(f => f.id));
                
                // Añadir solo los campos que no existen ya
                criterion.fields.forEach((field: Field) => {
                  if (!existingFieldIds.has(field.id)) {
                    updatedReportCard.sections[sectionIndex].fields.push({
                      ...field,
                      isAdditional: true
                    });
                  }
                });
              }
            });
            
            // Actualizar el boletín con los criterios adicionales
            setReportCard(updatedReportCard);
          } else {
            setReportCard(data);
          }
          
          // Inicializar las calificaciones
          if (studentGrades && studentGrades.grades) {
            setGrades(studentGrades.grades);
            setLocalGrades(studentGrades.grades);
          } else {
            // Inicializar calificaciones vacías
            const initialGrades: Grades = {};
            data.sections.forEach(section => {
              if (section.type === 'grades') {
                initialGrades[section.id] = {
                  attendance: '',
                  global: '',
                  criteria: {},
                  observations: ''
                };
              }
            });
            setGrades(initialGrades);
            setLocalGrades(initialGrades);
          }
          
          // Verificar la plantilla después de cargar el boletín
          const hasTemplate = await verifyTemplateAssignment(selectedStudent.courseId);
          
          if (!hasTemplate && isMounted) {
            console.log('El curso no tiene plantilla asignada');
          }
        }
      } catch (error) {
        console.error('Error al cargar el boletín:', error);
      }
    };

    loadReportCardData();

    return () => {
      isMounted = false;
    };
  }, [selectedStudent]); // Solo depender de selectedStudent

  // Añadir useEffect para cargar la configuración del centro
  useEffect(() => {
    const loadCenterConfig = async () => {
      try {
        const config = await getCenterConfig();
        setCenterConfig(config);
      } catch (error) {
        console.error('Error loading center config:', error);
      }
    };

    loadCenterConfig();
  }, []);

  // Añadir useEffect para cargar los criterios
  useEffect(() => {
    const loadCriteria = async () => {
      try {
        const criteria = await getEvaluationCriteria();
        setEvaluationCriteria(criteria);
      } catch (error) {
        console.error('Error al cargar criterios de evaluación:', error);
      }
    };

    loadCriteria();
  }, []);

  // Modificar handleGradeChange
  const handleGradeChange = (sectionId: string, type: keyof GradeData, fieldId: string, value: string) => {
    if (!selectedStudent || !reportCard) return;

    const newGrades = JSON.parse(JSON.stringify(localGrades));
    
    if (!newGrades[sectionId]) {
      newGrades[sectionId] = {
        attendance: '',
        global: '',
        criteria: {},
        observations: ''
      };
    }

    // Asegurarnos de que el valor se asigna correctamente
    if (type === 'criteria') {
      newGrades[sectionId].criteria[fieldId] = value;
    } else if (type === 'attendance') {
      newGrades[sectionId].attendance = value;
    } else if (type === 'global') {
      newGrades[sectionId].global = value;
    } else {
      newGrades[sectionId][type] = value;
    }

    console.log('Actualizando notas:', {
      sectionId,
      type,
      value,
      newGrades
    });

    setLocalGrades(newGrades);
    setHasChanges(true);
    setSaveStatus('unsaved');
  };

  // Añadir un efecto para detectar cambios
  useEffect(() => {
    // Comparar localGrades con grades para detectar cambios
    const hasUnsavedChanges = JSON.stringify(localGrades) !== JSON.stringify(grades);
    setHasChanges(hasUnsavedChanges);
    setSaveStatus(hasUnsavedChanges ? 'unsaved' : 'saved');
  }, [localGrades, grades]);

  // Modificar handleSaveChanges
  const handleSaveChanges = async () => {
    if (!selectedStudent?.id || !reportCard || !hasChanges) return;

    try {
      setSaveStatus('saving');
      const currentCourse = courses.find(c => c.id === selectedStudent.courseId);
      if (!currentCourse) {
        console.error('No se encontró el curso del estudiante');
        setSaveStatus('unsaved');
        return;
      }

      // Obtener los criterios adicionales actuales
      const additionalCriteria = reportCard.sections.map(section => ({
        sectionId: section.id,
        fields: section.fields
          .filter(field => field.isAdditional)
          .map(field => ({
            ...field,
            type: 'select' as const
          }))
      })).filter(section => section.fields.length > 0);

      console.log('Criterios adicionales a guardar:', additionalCriteria);

      // Crear una copia limpia de las notas
      const gradesToSave = JSON.parse(JSON.stringify(localGrades));
      
      console.log('Guardando notas:', {
        studentId: selectedStudent.id,
        courseId: currentCourse.id,
        templateId: currentCourse.templateId || '',
        academicYear: currentCourse.academicYear,
        grades: gradesToSave,
        additionalCriteria
      });

      await saveStudentGrades({
        studentId: selectedStudent.id,
        courseId: currentCourse.id,
        templateId: currentCourse.templateId || '', 
        academicYear: currentCourse.academicYear,
        grades: gradesToSave,
        additionalCriteria
      });

      // Actualizar el estado local para reflejar que se guardó correctamente
      setGrades(gradesToSave);
      setHasChanges(false);
      setSaveStatus('saved');
    } catch (error) {
      console.error('Error guardando:', error);
      setSaveStatus('unsaved');
      alert('Error al guardar los cambios. Por favor, inténtalo de nuevo.');
    }
  };

  // Modificar handleStudentSelect
  const handleStudentSelect = async (student: Student) => {
    if (hasChanges) {
      setPendingStudentChange(student);
      setIsConfirmationModalOpen(true);
      return;
    }

    // Proceder con el cambio de estudiante
    proceedWithStudentChange(student);
  };

  // Función para proceder con el cambio de estudiante
  const proceedWithStudentChange = (student: Student) => {
    setReportCard(null);
    setGrades({});
    setLocalGrades({});
    setIsAddingCriterion(false);
    setNewCriterionName('');
    setSelectedStudent(student);
    setPendingStudentChange(null);
  };

  // Modificar navigateToStudent
  const navigateToStudent = async (direction: 'prev' | 'next') => {
    const courseStudents = students.filter(s => s.courseId === selectedStudent?.courseId);
    let newIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;

    if (newIndex < 0) {
      newIndex = courseStudents.length - 1;
    } else if (newIndex >= courseStudents.length) {
      newIndex = 0;
    }

    const nextStudent = courseStudents[newIndex];
    
    if (hasChanges) {
      setPendingStudentChange(nextStudent);
      setIsConfirmationModalOpen(true);
      return;
    }

    setCurrentIndex(newIndex);
    proceedWithStudentChange(nextStudent);
  };

  // Reemplazar isAddingCriterion por una función que verifique la sección
  const isAddingCriterionForSection = (sectionId: string) => {
    return isAddingCriterion && addingSectionId === sectionId;
  };

  // Modificar la función para abrir el formulario de añadir criterio
  const openAddCriterionForm = (sectionId: string) => {
    setIsAddingCriterion(true);
    setAddingSectionId(sectionId);
  };

  // Modificar la función para cerrar el formulario
  const closeAddCriterionForm = () => {
    setIsAddingCriterion(false);
    setAddingSectionId(null);
    setNewCriterionName('');
  };

  // Implementar la función para eliminar un criterio adicional
  const handleDeleteCriterion = async (sectionId: string, fieldId: string) => {
    if (!selectedStudent || !reportCard) return;

    try {
      setSaveStatus('saving');
      
      // 1. Crear copias de los estados que vamos a modificar
      const newGrades = { ...localGrades };
      
      // 2. Actualizar el reportCard - eliminar el campo de la sección
      const updatedReportCard = { ...reportCard };
      const sectionIndex = updatedReportCard.sections.findIndex(s => s.id === sectionId);
      
      if (sectionIndex !== -1) {
        // Eliminar el campo de la lista de campos
        updatedReportCard.sections[sectionIndex].fields = 
          updatedReportCard.sections[sectionIndex].fields.filter(f => f.id !== fieldId);
        
        // 3. Eliminar el criterio de las notas
        if (newGrades[sectionId]?.criteria) {
          delete newGrades[sectionId].criteria[fieldId];
        }
        
        // 4. Actualizar el estado de additionalCriteria
        const course = courses.find(c => c.id === selectedStudent.courseId);
        if (course) {
          const existingAdditionalCriteria = await getStudentGrades(selectedStudent.id, course.id);
          let additionalCriteria = existingAdditionalCriteria?.additionalCriteria || [];
          
          // Actualizar los criterios adicionales
          additionalCriteria = additionalCriteria.map((ac: AdditionalCriterion) => {
            if (ac.sectionId === sectionId) {
              return {
                ...ac,
                fields: ac.fields.filter((f: Field) => f.id !== fieldId)
              };
            }
            return ac;
          }).filter((ac: AdditionalCriterion) => ac.fields.length > 0);
          
          // 5. Guardar los cambios
      await saveStudentGrades({
        studentId: selectedStudent.id,
            courseId: course.id,
            templateId: course.templateId || '',
            academicYear: course.academicYear,
        grades: newGrades,
        additionalCriteria
      });

          // 6. Actualizar todos los estados
          setReportCard(updatedReportCard);
          setLocalGrades(newGrades);
          setGrades(newGrades);
          setSaveStatus('saved');
        }
      }
    } catch (error) {
      console.error('Error al eliminar criterio:', error);
      setSaveStatus('unsaved');
    }
  };

  // Modificar la función handleAddCriterion para asegurarnos de que se guarda correctamente
  const handleAddCriterion = (sectionId: string) => {
    if (!newCriterionName.trim() || !reportCard) return;
    
    // Crear una copia del reportCard actual
    const updatedReportCard = { ...reportCard };
    
    // Encontrar la sección correcta
    const sectionIndex = updatedReportCard.sections.findIndex(s => s.id === sectionId);
    if (sectionIndex === -1) return;
    
    // Crear un nuevo criterio
    const newCriterion: Field = {
      id: crypto.randomUUID(),
      name: newCriterionName.trim(),
      type: 'select',
      isAdditional: true // Marcar como criterio adicional
    };
    
    // Añadir el criterio a la sección
    updatedReportCard.sections[sectionIndex].fields.push(newCriterion);
    
    // Actualizar el estado
    setReportCard(updatedReportCard);
    
    // Inicializar el valor del criterio en las calificaciones locales
    const updatedLocalGrades = { ...localGrades };
    if (!updatedLocalGrades[sectionId]) {
      updatedLocalGrades[sectionId] = {
        attendance: '',
        global: '',
        criteria: {},
        observations: ''
      };
    }
    
    // Inicializar el nuevo criterio con valor vacío
    updatedLocalGrades[sectionId].criteria[newCriterion.id] = '';
    
    // Actualizar el estado
    setLocalGrades(updatedLocalGrades);
    setHasChanges(true);
    
    // Limpiar el campo de entrada
    setNewCriterionName('');
    setIsAddingCriterion(false);
    setAddingSectionId(null);
    
    console.log('Criterio añadido:', {
      sectionId,
      criterion: newCriterion,
      updatedReportCard,
      updatedLocalGrades
    });
  };

  // Modificar el renderizado de los campos de notas
  // const renderGradeInput = (sectionId: string, field: Field) => (
  //   <input
  //     type="text"
  //     value={grades[section.id]?.criteria[field.id] || ''}
  //     onChange={(e) => handleGradeChange(section.id, 'criteria', field.id, e.target.value)}
  //     className="px-2 py-1 w-16 text-center bg-gray-50 rounded border-0 focus:ring-2 focus:ring-indigo-500"
  //     placeholder="--"
  //   />
  // );

  // Modificar el case 'header' en renderSection
  const renderSection = (section: Section) => {
    switch (section.type) {
      case 'header':
        return (
          <div className="p-6 mb-6 bg-white rounded-lg border border-gray-100 shadow-md">
            {/* Título */}
            <div className="mb-6 text-center">
              <h1 className="text-3xl font-bold text-gray-800 uppercase">Boletín de Calificaciones</h1>
            </div>

            {/* Contenedor principal del encabezado */}
            <div className="grid grid-cols-12 gap-4">
              {/* Logo a la izquierda */}
              <div className="col-span-3">
                {centerConfig?.logo ? (
                  <div className="relative w-40 h-40">
                    <img 
                      src={centerConfig.logo} 
                      alt="Logo del centro"
                      className="object-contain w-full h-full rounded-lg border"
                    />
                  </div>
                ) : (
                  <div className="flex justify-center items-center w-40 h-40 bg-gray-50 rounded-lg border-2 border-gray-300 border-dashed">
                    <span className="text-gray-500">Logo no disponible</span>
                  </div>
                )}
              </div>

              {/* Información central y derecha */}
              <div className="col-span-9 space-y-4">
                <div className="grid grid-cols-12 gap-4">
                  {/* Centro */}
                  <div className="col-span-8">
                    <label className="block mb-1 text-sm font-medium text-gray-700">
                      Centro
                    </label>
                    <div className="p-2 bg-gray-50 rounded border">
                      <span className="text-gray-800">
                        {centerConfig?.name || 'Centro no configurado'}
                      </span>
                    </div>
                  </div>

                  {/* Curso Académico */}
                  <div className="col-span-4">
                    <label className="block mb-1 text-sm font-medium text-gray-700">
                      Curso Académico
                    </label>
                    <div className="p-2 bg-gray-50 rounded border">
                      <span className="text-gray-800">
                        {courses.find(c => c.id === selectedStudent?.courseId)?.academicYear}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Información del estudiante */}
                <div className="space-y-3">
                  {/* Apellidos y nombre */}
                  <div>
                    <label className="block mb-1 text-sm font-medium text-gray-700">
                      Apellidos y nombre
                    </label>
                    <div className="p-2 bg-gray-50 rounded border">
                      <span className="text-gray-800">
                        {selectedStudent?.lastName}, {selectedStudent?.firstName}
                      </span>
                    </div>
                  </div>

                  {/* Curso e Instrumento */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-1 text-sm font-medium text-gray-700">
                        Curso
                      </label>
                      <div className="p-2 bg-gray-50 rounded border">
                        <span className="text-gray-800">
                          {courses.find(c => c.id === selectedStudent?.courseId)?.name}
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="block mb-1 text-sm font-medium text-gray-700">
                        Instrumento
                      </label>
                      <div className="p-2 bg-gray-50 rounded border">
                        <span className="text-gray-800">
                          {selectedStudent?.instrumentName}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'grades':
        return (
          <div className="p-6 mb-6 bg-white rounded-lg border border-gray-100 shadow-md">
            {/* Contenedor principal de la asignatura con título integrado */}
            <div className="overflow-hidden bg-white rounded-lg border border-gray-200 shadow-sm">
              {/* Título de la asignatura con fondo azul más visible */}
              <div className="px-6 py-4 bg-gradient-to-r from-blue-100 to-blue-50 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-800">
                  {section.title}
                </h2>
              </div>

              {/* Contenido de la asignatura */}
              <div className="p-6 space-y-4">
                {/* Línea principal con curso, faltas y calificación */}
                <div className="grid grid-cols-12 gap-4 items-center p-4 bg-gray-50 rounded-lg">
                  {/* Curso */}
                  <div className="col-span-5">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-700">CURSO</span>
                      <div className="flex-1 px-3 py-2 bg-white rounded-md border">
                        <span className="text-gray-800">
                          {courses.find(c => c.id === selectedStudent?.courseId)?.name || ''}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Faltas de asistencia */}
                  <div className="col-span-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-700">FALTAS ASISTENCIA</span>
                      <input
                        type="number"
                        min="0"
                        value={localGrades[section.id]?.attendance || ''}
                        onChange={(e) => handleGradeChange(section.id, 'attendance', '', e.target.value)}
                        className="px-3 py-2 w-20 text-center rounded-md border focus:ring-2 focus:ring-indigo-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  {/* Calificación global */}
                  <div className="col-span-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-700">CALIFICACIÓN GLOBAL</span>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        step="0.01"
                        value={localGrades[section.id]?.global || ''}
                        onChange={(e) => handleGradeChange(section.id, 'global', '', e.target.value)}
                        className={`
                          px-3 py-2 w-20 text-center rounded-md border focus:ring-2 focus:ring-indigo-500 
                          [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none
                          ${parseFloat(localGrades[section.id]?.global || '0') >= 5 ? 'text-gray-900' : 'text-red-600'}
                          ${!localGrades[section.id]?.global && 'text-gray-900'}
                        `}
                        placeholder="--"
                      />
                    </div>
                  </div>
                </div>

                {/* Criterios de evaluación */}
                <div className="mb-6">
                  <h4 className="mb-4 text-base font-semibold text-gray-800 border-b pb-2">
                    Criterios de evaluación
                  </h4>
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    {section.fields
                      .filter(field => field.type === 'select')
                      .map(field => (
                        <div key={field.id} className="relative">
                          <div className="flex gap-4 items-center">
                            <label className="min-w-[120px] text-sm font-medium text-gray-700">
                              {field.name}
                            </label>
                            <div className="flex-1">
                              <GradeSelect
                                currentValue={localGrades[section.id]?.criteria[field.id] || ''}
                                onChange={(value) => handleGradeChange(section.id, 'criteria', field.id, value)}
                                evaluationCriteria={evaluationCriteria}
                              />
                            </div>
                            
                            {/* Botón de eliminar solo visible cuando isEditingCriteria es true */}
                            {field.isAdditional && isEditingCriteria && (
                              <button
                                type="button"
                                onClick={() => handleDeleteCriterion(section.id, field.id)}
                                className="p-2 text-red-600 bg-red-50 rounded-full hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                                aria-label="Eliminar criterio"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Campo de observaciones */}
                {section.fields.filter(field => field.type === 'text').map((field) => (
                  <div 
                    key={field.id}
                    className="mt-4"
                  >
                    <div className="mb-2">
                      <h3 className="text-sm font-medium text-gray-700">
                        {field.name}
                      </h3>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <RichTextEditor
                        initialValue={localGrades[section.id]?.observations || ''}
                        onChange={(newValue) => {
                          const newGrades = {
                            ...localGrades,
                            [section.id]: {
                              ...localGrades[section.id] || {},
                              attendance: localGrades[section.id]?.attendance || '',
                              global: localGrades[section.id]?.global || '',
                              criteria: localGrades[section.id]?.criteria || {},
                              observations: newValue
                            }
                          };
                          setLocalGrades(newGrades);
                          setHasChanges(true);
                          setSaveStatus('unsaved');
                        }}
                        placeholder="Espacio para observaciones..."
                        showToolbar={true}
                      />
                    </div>
                  </div>
                ))}

                {/* Botón y formulario para añadir criterio */}
                <div className="flex gap-2 items-center mt-4">
                  {isAddingCriterionForSection(section.id) ? (
                    <form onSubmit={(e: React.FormEvent) => {
                      e.preventDefault(); // Prevenir el comportamiento por defecto
                      handleAddCriterion(section.id);
                    }} className="space-y-4">
                      <div>
                        <input
                          type="text"
                          value={newCriterionName}
                          onChange={(e) => setNewCriterionName(e.target.value)}
                          className="px-4 py-2 w-full text-sm rounded-md border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="Nombre del nuevo criterio"
                        />
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            closeAddCriterionForm();
                          }}
                          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white rounded-md border border-gray-300 hover:bg-gray-50"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          disabled={!newCriterionName.trim()}
                          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Guardar Criterio
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex gap-2">
                    <button
                        onClick={(e) => {
                          e.preventDefault();
                          openAddCriterionForm(section.id);
                        }}
                      className="flex items-center px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-md hover:bg-indigo-100"
                    >
                      <Plus className="mr-2 w-4 h-4" />
                      Añadir criterio adicional
                    </button>
                      
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          setIsEditingCriteria(!isEditingCriteria);
                        }}
                        className={`p-2 rounded-md transition-colors ${
                          isEditingCriteria 
                            ? 'text-red-600 bg-red-50 hover:bg-red-100' 
                            : 'text-gray-600 bg-gray-50 hover:bg-gray-100'
                        }`}
                        title={isEditingCriteria ? 'Terminar edición' : 'Editar criterios'}
                      >
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          width="16" 
                          height="16" 
                          viewBox="0 0 24 24" 
                          fill="none" 
                          stroke="currentColor" 
                          strokeWidth="2" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                        >
                          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3Z"/>
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      case 'observations':
        return (
          <div className="p-6 mb-6 bg-white rounded-lg border border-gray-100 shadow-md">
            <h4 className="mb-4 text-base font-semibold text-gray-800 border-b pb-2">
              {section.title}
            </h4>
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <RichTextEditor
                initialValue={localGrades[section.id]?.observations || ''}
                onChange={(newValue) => {
                  const newGrades = {
                    ...localGrades,
                    [section.id]: {
                      ...localGrades[section.id] || {},
                      attendance: localGrades[section.id]?.attendance || '',
                      global: localGrades[section.id]?.global || '',
                      criteria: localGrades[section.id]?.criteria || {},
                      observations: newValue
                    }
                  };
                  setLocalGrades(newGrades);
                  setHasChanges(true);
                  setSaveStatus('unsaved');
                }}
                placeholder="Espacio para observaciones..."
                showToolbar={true}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Modificar el componente GradeSelect
  const GradeSelect = ({ currentValue, onChange }: GradeSelectProps) => {
    // Encontrar el criterio por defecto
    const defaultCriterion = evaluationCriteria.find(c => c.isDefault);
    
    // Si no hay valor seleccionado y hay un criterio por defecto, usar ese
    const effectiveValue = currentValue || (defaultCriterion?.value || '');
    
    return (
      <Listbox 
        value={effectiveValue} 
        onChange={(newValue) => {
          onChange(newValue);
        }}
      >
        {() => (
          <div className="relative min-w-[200px]">
            <Listbox.Button className="relative py-2 pr-10 pl-3 w-full text-left bg-gray-50 rounded-md border border-gray-300 shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500">
              <span className="block whitespace-pre-line">
                {evaluationCriteria.find(opt => opt.value === effectiveValue)?.label || "--"}
              </span>
              <span className="flex absolute inset-y-0 right-0 items-center pr-2 pointer-events-none">
                <ChevronsUpDown className="w-5 h-5 text-gray-400" />
              </span>
            </Listbox.Button>

            <Transition
              as={Fragment}
              leave="transition ease-in duration-100"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <Listbox.Options className="absolute z-10 py-1 mt-1 w-full max-h-60 text-base bg-white rounded-md ring-1 ring-black ring-opacity-5 shadow-lg focus:outline-none sm:text-sm">
                {evaluationCriteria.map((criterion) => (
                  <Listbox.Option
                    key={criterion.id}
                    value={criterion.value}
                    className={({ active }) =>
                      `relative cursor-pointer select-none py-2 pl-10 pr-4 ${
                        active ? 'bg-indigo-600 text-white' : 'text-gray-900'
                      }`
                    }
                  >
                    {({ selected }) => (
                      <>
                        <span className={`block whitespace-pre-line ${
                          selected ? 'font-medium' : 'font-normal'
                        } ${criterion.isDefault ? 'italic' : ''}`}>
                          {criterion.label}
                          {criterion.isDefault && ' (Por defecto)'}
                        </span>
                        {selected ? (
                          <span className="flex absolute inset-y-0 left-0 items-center pl-3 text-indigo-600">
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
        )}
      </Listbox>
    );
  };

  // Añadir el indicador de carga
  if (loading) {
    return (
      <div className="flex fixed inset-0 justify-center items-center bg-gray-500 bg-opacity-75">
        <div className="p-6 bg-white rounded-lg shadow-xl">
          <div className="mx-auto w-12 h-12 rounded-full border-b-2 border-indigo-600 animate-spin"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Barra superior */}
      <div className="flex justify-between items-center p-4 bg-white border-b">
        <BackButton />
        <h1 className="text-xl font-bold">Boletín de Notas</h1>
        <div className="w-10" /> {/* Espaciador */}
      </div>

      {/* Panel de estudiantes */}
      <div className="flex h-full">
      {/* Panel lateral */}
      <div className="flex flex-col w-80 h-screen bg-white border-r border-gray-200 shadow-sm">
        <div className="p-6">
          <div className="mb-6">
            <BackButton />
          </div>
          <h2 className="mb-6 text-xl font-semibold text-gray-800">Alumnos por Nivel</h2>
        </div>
        {/* Lista de alumnos con scroll independiente */}
        <div className="overflow-y-auto flex-1">
          <div className="px-6 pb-6">
            {Object.entries(studentsByLevel).map(([levelId, level]) => (
              <div key={levelId} className="mb-4">
                <h3 className="mb-2 font-medium text-gray-700 text-md">{level.levelName}</h3>
                {Object.entries(level.courses).map(([courseId, course]) => (
                  <div key={courseId} className="mb-2 ml-2">
                    <h4 className="mb-1 text-sm font-medium text-gray-600">{course.courseName}</h4>
                    <ul className="ml-2 space-y-1">
                      {course.students.map(student => (
                        <li key={student.id}>
                          <button
                            onClick={() => handleStudentSelect(student)}
                            className={`w-full text-left px-2 py-1 text-sm rounded ${
                              selectedStudent?.id === student.id
                                ? 'bg-indigo-100 text-indigo-700'
                                : 'hover:bg-gray-100'
                            }`}
                          >
                            {student.lastName}, {student.firstName}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

        {/* Contenido principal */}
        <div className="flex flex-col flex-1">
        {/* Contenido scrolleable */}
        <div className="overflow-y-auto flex-1">
          <div className="p-8 pb-20">
            {selectedStudent && reportCard ? (
              <div className="mx-auto max-w-4xl">
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-bold text-gray-800">
                    Boletín de {selectedStudent.firstName} {selectedStudent.lastName}
                  </h2>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => navigateToStudent('prev')}
                      disabled={!selectedStudent}
                      className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-50"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button
                      onClick={() => navigateToStudent('next')}
                      disabled={!selectedStudent}
                      className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-50"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>
                  </div>
                </div>

                {/* Renderizar las secciones del boletín */}
                <div className="space-y-6">
                  {reportCard.sections.map(section => (
                    <div key={section.id}>
                      {renderSection(section)}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex justify-center items-center h-full">
                <div className="text-center text-gray-500">
                  <div className="mb-4">
                    <svg className="mx-auto w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <h3 className="mb-2 text-xl font-medium text-gray-900">Sin boletín seleccionado</h3>
                  <p>Selecciona un alumno para ver su boletín</p>
                </div>
              </div>
            )}
          </div>
        </div>

          {/* Barra de estado y guardado (fija en la parte inferior) */}
          <div className="sticky right-0 bottom-0 left-0 z-10 p-4 bg-white border-t shadow-md">
            <div className="flex gap-4 justify-end items-center mx-auto max-w-4xl">
              <button
                onClick={handleSaveChanges}
                disabled={!hasChanges || saveStatus === 'saving'}
                className={`
                  flex items-center px-4 py-2 text-sm font-medium rounded-md transition-all duration-200
                  ${saveStatus === 'saving'
                    ? 'bg-blue-100 text-blue-700 cursor-wait'
                    : saveStatus === 'saved'
                      ? 'bg-green-100 text-green-700 cursor-default'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }
                  ${!hasChanges && 'opacity-50 cursor-not-allowed'}
                `}
              >
                <div className="flex gap-2 items-center">
                  {saveStatus === 'saving' ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-blue-600 animate-spin border-t-transparent"></div>
                      Guardando...
                    </>
                  ) : saveStatus === 'saved' ? (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
                      Guardado
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path>
                      </svg>
                      Guardar cambios
                    </>
        )}
      </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de confirmación */}
      <ConfirmationModal
        isOpen={isConfirmationModalOpen}
        onClose={() => {
          setIsConfirmationModalOpen(false);
          if (pendingStudentChange) {
            proceedWithStudentChange(pendingStudentChange);
          }
        }}
        onConfirm={async () => {
          await handleSaveChanges();
          setIsConfirmationModalOpen(false);
          if (pendingStudentChange) {
            proceedWithStudentChange(pendingStudentChange);
          }
        }}
      />
    </div>
  );
} 
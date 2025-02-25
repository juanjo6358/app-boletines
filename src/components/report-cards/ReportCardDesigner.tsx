import { useState, useEffect } from 'react';
import { Plus, Trash2, GripVertical, Save } from 'lucide-react';
import { DndContext, DragEndEvent, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  getCourses, 
  getCourseTemplates, 
  getReportCard,
  saveReportCard,
  getCriteriaGroups,
  saveCriteriaGroup,
  deleteCriteriaGroup,
  getAcademicYears,
  executeWithRetry,
  verifyTemplateAssignment,
  getCenterConfig
} from '../../lib/db';
import './ReportCardDesigner.css';
import { 
  CourseTemplate, 
  Course, 
  CourseTemplateSubject,
  Section,
  Field,
  CriteriaGroup,
  AcademicYear} from '../../types';
import { RichTextEditor } from '../common/RichTextEditor';

// Componente para una sección arrastrable
function DraggableSection({ 
  section, 
  onDelete, 
  onUpdateFields,
  onUpdateSection,
  centerConfig,
  getActiveAcademicYear,
  courses,
  selectedCourse,
  // @ts-ignore - savedGroups se usa indirectamente en handleDrop y handleSaveTemplate
  savedGroups,
  setSavedGroups
}: { 
  section: Section; 
  onDelete: (id: string) => void;
  onUpdateFields: (sectionId: string, fields: Field[]) => void;
  onUpdateSection: (section: Section) => void;
  centerConfig: { name: string; logo?: string } | null;
  getActiveAcademicYear: () => string;
  courses: Course[];
  selectedCourse: string;
  savedGroups: CriteriaGroup[];
  setSavedGroups: React.Dispatch<React.SetStateAction<CriteriaGroup[]>>;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: section.id });

  const [newCriterionName, setNewCriterionName] = useState('');
  const [isAddingCriterion, setIsAddingCriterion] = useState(false);
  const [isAddingTemplate, setIsAddingTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [globalGrade, setGlobalGrade] = useState('');

  const handleDeleteCriterion = (fieldId: string) => {
    const updatedFields = section.fields.filter(field => field.id !== fieldId);
    onUpdateFields(section.id, updatedFields);
  };

  const handleAddCriterion = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCriterionName.trim()) {
      const newField: Field = {
        id: crypto.randomUUID(),
        name: newCriterionName.trim(),
        type: 'select'
      };
      onUpdateFields(section.id, [...section.fields, newField]);
      setNewCriterionName('');
      setIsAddingCriterion(false);
    }
  };

  // Función para guardar plantilla
  const handleSaveTemplate = async (e: React.FormEvent, section: Section) => {
    e.preventDefault();
    if (!templateName.trim()) return;

    try {
      const newGroup = await saveCriteriaGroup({
        name: templateName,
        criteria: section.fields.filter(f => f.type === 'select')
      });
      
      // Actualizar la lista de grupos inmediatamente
      setSavedGroups((prevGroups: CriteriaGroup[]) => [...prevGroups, newGroup]);
      
      setTemplateName('');
      setIsAddingTemplate(false);
    } catch (error) {
      console.error('Error al guardar la plantilla:', error);
    }
  };

  const handleDrop = (e: React.DragEvent, sectionId: string) => {
    e.preventDefault();
    console.log('Drop event triggered on section:', sectionId);
    
    try {
      const jsonData = e.dataTransfer.getData('application/json');
      console.log('Raw JSON data:', jsonData);
      
      if (!jsonData) {
        console.error('No se recibieron datos JSON en el evento drop');
        return;
      }
      
      const data = JSON.parse(jsonData);
      console.log('Datos recibidos en drop:', data);
      
      if (data.type === 'criteria-template') {
        if (Array.isArray(data.data)) {
          // Crear nuevos campos con IDs únicos
          const newFields = data.data.map((criterion: any) => ({
            id: crypto.randomUUID(),
            name: criterion.name || 'Criterio sin nombre',
            type: 'select'
          }));
          
          console.log('Añadiendo campos:', newFields);
          
          // Actualizar los campos de la sección
          const updatedFields = [...section.fields, ...newFields];
          console.log('Campos actualizados:', updatedFields);
          
          onUpdateFields(sectionId, updatedFields);
        } else {
          console.error('data.data no es un array:', data.data);
        }
      }
    } catch (error) {
      console.error('Error al procesar el drop:', error);
    }
  };

  const renderSectionContent = () => {
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
                        {getActiveAcademicYear()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Apellidos y nombre - ancho completo */}
                <div className="w-full">
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Apellidos y nombre
                  </label>
                  <div className="p-2 bg-blue-50 rounded border border-blue-200">
                    <span className="italic text-blue-600">{'{{apellidos}}, {{nombre}}'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'grades':
        // Usar savedGroups en una variable para que TypeScript detecte su uso
        const availableTemplates = savedGroups;
        console.log('Plantillas disponibles:', availableTemplates.length);
        
        return (
          <div className="space-y-4">
            {/* Línea principal con curso, faltas y calificación en una sola fila */}
            <div className="grid grid-cols-12 gap-4 items-center p-4 bg-gray-50 rounded-lg">
              <div className="col-span-5">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-700">CURSO</span>
                  <div className="flex-1 px-3 py-2 bg-white rounded-md border">
                    <span className="text-gray-800">
                      {courses.find((c: Course) => c.id === selectedCourse)?.name || ''}
                    </span>
                  </div>
                </div>
              </div>

              <div className="col-span-3">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-700">FALTAS ASISTENCIA</span>
                  <input
                    type="number"
                    min="0"
                    className="px-3 py-2 w-20 text-center rounded-md border focus:ring-2 focus:ring-indigo-500"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="col-span-4">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-700">CALIFICACIÓN GLOBAL</span>
                  <div className="flex-1">
                    <input
                      type="number"
                      min="0"
                      max="10"
                      step="0.1"
                      value={globalGrade}
                      onChange={(e) => setGlobalGrade(e.target.value)}
                      className="px-3 py-2 w-full bg-white rounded-md border"
                      placeholder="0.0"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Criterios de evaluación - 2 por fila */}
            <div 
              className="grid grid-cols-2 gap-4 p-4 rounded-lg border-2 border-gray-300 border-dashed"
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation(); // Evitar que el evento se propague
                e.currentTarget.classList.add('bg-indigo-50', 'border-indigo-300');
              }}
              onDragEnter={(e) => {
                e.preventDefault();
                e.currentTarget.classList.add('bg-indigo-50', 'border-indigo-300');
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove('bg-indigo-50', 'border-indigo-300');
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation(); // Evitar que el evento se propague
                e.currentTarget.classList.remove('bg-indigo-50', 'border-indigo-300');
                handleDrop(e, section.id);
              }}
            >
              {/* Mensaje cuando no hay criterios */}
              {section.fields.filter(field => field.type === 'select').length === 0 && (
                <div className="col-span-2 p-4 text-center text-gray-500">
                  <p>Arrastra plantillas de criterios aquí o añade criterios individuales</p>
                </div>
              )}
              
              {/* Lista de criterios existentes */}
              {section.fields.filter(field => field.type === 'select').map((field) => (
                <div 
                  key={field.id}
                  className="flex justify-between items-center px-4 py-2 w-full bg-white rounded-lg border border-gray-200"
                >
                  <span className="text-sm font-medium text-gray-700">
                    {field.name}
                  </span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleDeleteCriterion(field.id)}
                      className="p-1 text-red-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Campo de observaciones */}
            {section.fields.filter(field => field.type === 'text').map((field) => (
              <div 
                key={field.id}
                className="mt-6 space-y-2"
              >
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-700">
                    {field.name}
                  </h3>
                  <button
                    onClick={() => handleDeleteCriterion(field.id)}
                    className="p-1 text-red-400 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-4 bg-white rounded-lg border border-gray-200">
                  <textarea
                    className="w-full min-h-[100px] p-3 bg-gray-50 rounded-md border focus:ring-2 focus:ring-indigo-500"
                    placeholder="Espacio para observaciones..."
                    rows={4}
                  />
                </div>
              </div>
            ))}

            {/* Botones de acción */}
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setIsAddingCriterion(true)}
                className="flex items-center px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-md hover:bg-indigo-100"
              >
                <Plus className="mr-2 w-4 h-4" />
                Añadir criterio
              </button>

              {/* Botón de observaciones */}
              {!section.fields.some(field => field.type === 'text') && (
                <button
                  onClick={() => onUpdateFields(section.id, [
                    ...section.fields,
                    {
                      id: crypto.randomUUID(),
                      name: 'Observaciones',
                      type: 'text'
                    }
                  ])}
                  className="flex items-center px-4 py-2 text-sm font-medium text-green-600 bg-green-50 rounded-md hover:bg-green-100"
                >
                  <Plus className="mr-2 w-4 h-4" />
                  Añadir observaciones
                </button>
              )}

              {/* Botón de guardar plantilla */}
              <button
                onClick={() => setIsAddingTemplate(true)}
                className="flex items-center px-4 py-2 text-sm font-medium text-purple-600 bg-purple-50 rounded-md hover:bg-purple-100"
              >
                <Save className="mr-2 w-4 h-4" />
                Guardar como plantilla
              </button>
            </div>

            {/* Modal para añadir criterio */}
            {isAddingCriterion && (
              <div className="p-4 mt-4 bg-gray-50 rounded-lg border">
                <form onSubmit={handleAddCriterion}>
                  <input
                    type="text"
                    value={newCriterionName}
                    onChange={(e) => setNewCriterionName(e.target.value)}
                    className="block px-3 py-2 w-full rounded-md border"
                    placeholder="Nombre del criterio"
                  />
                  <div className="flex justify-end mt-3 space-x-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingCriterion(false)}
                      className="px-3 py-1 text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1 text-white bg-indigo-600 rounded hover:bg-indigo-700"
                    >
                      Añadir
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        );

      case 'observations':
        return (
          <div className="p-4">
            <RichTextEditor 
              initialValue={section.data?.content || ''}
              onChange={(html) => {
                const updatedSection = { ...section };
                if (!updatedSection.data) {
                  updatedSection.data = {};
                }
                updatedSection.data.content = html;
                onUpdateSection(updatedSection);
              }}
              placeholder="Escribe el contenido aquí..."
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div
      ref={setNodeRef}
      className={`
        draggable-section
        draggable-section-container
        ${isDragging ? 'draggable-section-dragging' : 'draggable-section-normal'}
      `}
      style={{
        '--transform': CSS.Transform.toString(transform),
        '--transition': transition
      } as React.CSSProperties}
    >
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center">
          <button
            {...attributes}
            {...listeners}
            className="p-1 mr-2 text-gray-400 hover:text-gray-600"
          >
            <GripVertical className="w-5 h-5" />
          </button>
          <h3 className="text-lg font-medium">{section.title}</h3>
        </div>
        <button
          className="p-1 text-red-400 hover:text-red-600"
          onClick={() => onDelete(section.id)}
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      {renderSectionContent()}

      {/* Modal para guardar plantilla */}
      {isAddingTemplate && (
        <div className="flex fixed inset-0 justify-center items-center bg-black bg-opacity-50">
          <div className="p-6 bg-white rounded-lg shadow-xl">
            <h3 className="mb-4 text-lg font-medium text-gray-900">
              Guardar plantilla de criterios
            </h3>
            <form onSubmit={(e) => handleSaveTemplate(e, section)}>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="block px-3 py-2 w-full rounded-md border"
                placeholder="Nombre de la plantilla"
              />
              <div className="flex justify-end mt-4 space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddingTemplate(false)}
                  className="px-4 py-2 text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-white bg-purple-600 rounded hover:bg-purple-700"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export function ReportCardDesigner() {
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [courses, setCourses] = useState<Course[]>([]);
  const [templates, setTemplates] = useState<CourseTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState<Section[]>([]);
  const [showProperties, setShowProperties] = useState(true);
  const [savedGroups, setSavedGroups] = useState<CriteriaGroup[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [currentTemplateSubjects, setCurrentTemplateSubjects] = useState<CourseTemplateSubject[]>([]);
  const [centerConfig, setCenterConfig] = useState<{name: string; logo?: string} | null>(null);
  const [saveStatus, setSaveStatus] = useState<'unsaved' | 'saving' | 'saved'>('saved');
  const [hasChanges, setHasChanges] = useState(false);
  const [reportCardId, setReportCardId] = useState<string | null>(null);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [originalSections, setOriginalSections] = useState<Section[]>([]);
  const [originalSubjects, setOriginalSubjects] = useState<CourseTemplateSubject[]>([]);

  // Cargar datos iniciales
  useEffect(() => {
    loadData();
  }, []);

  // Cargar datos cuando cambia el curso
  useEffect(() => {
    console.log("useEffect: selectedCourse changed to", selectedCourse);
    if (selectedCourse) {
      loadReportCard();
    } else {
      setSections([]);
      setCurrentTemplateSubjects([]);
    }
  }, [selectedCourse, courses, templates]);

  // Cargar grupos de criterios
  useEffect(() => {
    getCriteriaGroups()
      .then(groups => {
        console.log('Criterios cargados:', groups);
        setSavedGroups(groups);
      })
      .catch(console.error);
  }, []);

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

  // Función para obtener el año académico activo
  const getActiveAcademicYear = () => {
    return academicYears.find(year => year.isActive)?.name || '';
  };

  // Modificar loadData para cargar también los años académicos
  async function loadData() {
    try {
      const [coursesData, templatesData, academicYearsData] = await Promise.all([
        getCourses(),
        getCourseTemplates(),
        getAcademicYears()
      ]);
      setCourses(coursesData);
      setTemplates(templatesData);
      setAcademicYears(academicYearsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  const addSection = (type: 'header' | 'grades' | 'observations' | 'signatures') => {
    const newSection: Section = {
      id: crypto.randomUUID(),
      title: type === 'header' ? 'Encabezado' :
            type === 'grades' ? 'Calificaciones' :
            type === 'observations' ? 'Observaciones' : 'Firmas',
      type,
      fields: []
    };
    setSections([...sections, newSection]);
    setHasChanges(true);
    setSaveStatus('unsaved');
  };

  const deleteSection = (id: string) => {
    setSections(sections.filter(s => s.id !== id));
    setHasChanges(true);
    setSaveStatus('unsaved');
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = sections.findIndex(s => s.id === active.id);
      const newIndex = sections.findIndex(s => s.id === over.id);
      
      const newSections = [...sections];
      const [movedSection] = newSections.splice(oldIndex, 1);
      newSections.splice(newIndex, 0, movedSection);
      
      setSections(newSections);
    }
    setHasChanges(true);
    setSaveStatus('unsaved');
  };

  const updateSectionFields = (sectionId: string, fields: Field[]) => {
    setSections(sections.map(section => 
      section.id === sectionId 
        ? { ...section, fields }
        : section
    ));
    setHasChanges(true);
    setSaveStatus('unsaved');
  };

  const loadReportCard = async () => {
    try {
      const currentCourse = courses.find(c => c.id === selectedCourse);
      const activeAcademicYear = getActiveAcademicYear();

      if (currentCourse) {
        await verifyTemplateAssignment(selectedCourse);
        
        // Buscar la plantilla
        let template = templates.find(t => t.id === currentCourse.templateId);
        if (!template) {
          template = templates.find(t =>
            t.courseId === currentCourse.id &&
            t.academicYear === activeAcademicYear
          );
        }

        if (template) {
          // Establecer las asignaturas de la plantilla
          const templateSubjects = template.subjects;
          setCurrentTemplateSubjects(templateSubjects);
          setOriginalSubjects(JSON.parse(JSON.stringify(templateSubjects))); // Copia profunda
          
          const reportCard = await executeWithRetry(() => getReportCard(selectedCourse));
          if (reportCard) {
            setSections(reportCard.sections);
            setOriginalSections(JSON.parse(JSON.stringify(reportCard.sections))); // Copia profunda
            setReportCardId(reportCard.id);
          } else {
            setSections([]);
            setOriginalSections([]);
            setReportCardId(null);
          }
        } else {
          setCurrentTemplateSubjects([]);
          setOriginalSubjects([]);
          setSections([]);
          setOriginalSections([]);
          setReportCardId(null);
        }
        
        // Marcar la carga inicial como completa y resetear hasChanges
        setInitialLoadComplete(true);
        setHasChanges(false);
        setSaveStatus('saved');
      }
    } catch (error) {
      console.error('Error loading report card:', error);
    }
  };

  const checkForChanges = () => {
    // Comparar secciones
    const sectionsChanged = JSON.stringify(sections) !== JSON.stringify(originalSections);
    
    // Comparar asignaturas
    const subjectsChanged = JSON.stringify(currentTemplateSubjects) !== JSON.stringify(originalSubjects);
    
    // Actualizar el estado de cambios
    const hasAnyChanges = sectionsChanged || subjectsChanged;
    setHasChanges(hasAnyChanges);
    setSaveStatus(hasAnyChanges ? 'unsaved' : 'saved');
  };

  const handleSave = async () => {
    if (!selectedCourse || !hasChanges) return;

    try {
      setSaveStatus('saving');
      
      // Obtener el curso actual
      const currentCourse = courses.find(c => c.id === selectedCourse);
      if (!currentCourse) {
        throw new Error('No se encontró el curso');
      }
      
      // Buscar la plantilla existente o crear un ID temporal
      const template = templates.find(t => 
        t.courseId === selectedCourse && 
        t.academicYear === getActiveAcademicYear()
      );
      
      // Si no hay plantilla, necesitamos crear una o asignar una existente
      let templateId = template?.id;
      
      if (!templateId) {
        console.log('No se encontró plantilla para el curso, creando una temporal...');
        // Generar un ID temporal para la plantilla
        templateId = `temp-template-${crypto.randomUUID()}`;
        
        // Actualizar el curso con el nuevo templateId
        try {
          console.log('Actualizando curso con templateId:', templateId);
          
          // Si verifyTemplateAssignment solo acepta un argumento, usamos otra función
          // o actualizamos el curso de otra manera
          await verifyTemplateAssignment(selectedCourse);
          
          // Aquí podríamos necesitar una función adicional para actualizar el templateId
          // Por ejemplo:
          // await updateCourseTemplate(selectedCourse, templateId);
        } catch (error) {
          console.error('Error al asignar plantilla al curso:', error);
        }
      }
      
      console.log('Guardando boletín con templateId:', templateId);
      
      // Guardar el boletín con un ID y el templateId
      await saveReportCard({
        id: reportCardId || crypto.randomUUID(),
        courseId: selectedCourse,
        sections,
        subjects: currentTemplateSubjects
      }, templateId);
      
      // Actualizar los originales después de guardar
      setOriginalSections(JSON.parse(JSON.stringify(sections)));
      setOriginalSubjects(JSON.parse(JSON.stringify(currentTemplateSubjects)));
      
      setSaveStatus('saved');
      setHasChanges(false);
      
      console.log('Boletín guardado correctamente');
      
      // Recargar los cursos para actualizar la información de templateId
      const updatedCourses = await getCourses();
      setCourses(updatedCourses);
      
    } catch (error) {
      console.error('Error al guardar el boletín:', error);
      setSaveStatus('unsaved');
    }
  };

  // Modificar el useEffect para actualizar hasChanges cuando cambia algo
  useEffect(() => {
    if (sections.length > 0 && !loading) {
      setHasChanges(true);
      setSaveStatus('unsaved');
    }
  }, [sections, currentTemplateSubjects]);

  const updateSection = (updatedSection: Section) => {
    setSections(sections.map(section => 
      section.id === updatedSection.id 
        ? updatedSection
        : section
    ));
    setHasChanges(true);
    setSaveStatus('unsaved');
  };

  // Añadir una función para manejar la navegación
  const handleNavigation = (action: () => void) => {
    if (hasChanges) {
      setPendingAction(() => action);
      setIsConfirmationModalOpen(true);
    } else {
      action();
    }
  };

  // Añadir un useEffect para detectar cuando el usuario intenta salir de la página
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasChanges]);

  // Añadir un useEffect para que solo se active después de la carga inicial
  useEffect(() => {
    if (initialLoadComplete) {
      checkForChanges();
    }
  }, [sections, currentTemplateSubjects, initialLoadComplete]);

  // Añadir un componente para el modal de confirmación
  const ConfirmationModal = () => {
    if (!isConfirmationModalOpen) return null;

    return (
      <div className="flex fixed inset-0 z-50 justify-center items-center bg-black bg-opacity-50">
        <div className="p-6 max-w-md bg-white rounded-lg shadow-xl">
          <h3 className="mb-4 text-lg font-medium text-gray-900">Cambios sin guardar</h3>
          <p className="mb-6 text-gray-600">
            Hay cambios sin guardar. ¿Quieres guardar los cambios antes de continuar?
          </p>
          <div className="flex justify-end space-x-4">
            <button
              onClick={() => {
                setIsConfirmationModalOpen(false);
                if (pendingAction) pendingAction();
              }}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              No guardar
            </button>
            <button
              onClick={() => {
                setIsConfirmationModalOpen(false);
              }}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancelar
            </button>
            <button
              onClick={async () => {
                await handleSave();
                setIsConfirmationModalOpen(false);
                if (pendingAction) pendingAction();
              }}
              className="px-4 py-2 text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
            >
              Guardar
            </button>
          </div>
        </div>
      </div>
    );
  };

  // 1. Restaurar la función handleDeleteGroup
  const handleDeleteGroup = async (groupId: string) => {
    try {
      await deleteCriteriaGroup(groupId);
      setSavedGroups(savedGroups.filter(group => group.id !== groupId));
    } catch (error) {
      console.error('Error deleting criteria group:', error);
    }
  };

  return (
    <div className="relative p-6 pb-20">
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="loading-spinner"></div>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <label 
              htmlFor="course-select" 
              className="block mb-2 text-sm font-medium text-gray-700"
            >
              Seleccionar Curso
            </label>
            <select
              id="course-select"
              value={selectedCourse}
              onChange={(e) => {
                const newCourseId = e.target.value;
                handleNavigation(() => setSelectedCourse(newCourseId));
              }}
              className="p-2 w-full max-w-xs rounded border border-gray-300"
              aria-label="Seleccionar curso"
            >
              <option value="">Seleccione un curso...</option>
              {courses.map(course => (
                <option key={course.id} value={course.id}>
                  {course.name} - {course.levelName} - {course.academicYear}
                </option>
              ))}
            </select>
          </div>

          {selectedCourse && (
            <>
              {/* Botones de secciones generales */}
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-semibold">Diseñador de Boletines</h1>
            <div className="space-x-2">
              <button
                onClick={() => addSection('header')}
                className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                    <Plus className="inline-block mr-2 w-5 h-5" />
                Añadir Encabezado
              </button>
              <button
                onClick={() => addSection('signatures')}
                className="px-4 py-2 text-white bg-purple-600 rounded-md hover:bg-purple-700"
              >
                    <Plus className="inline-block mr-2 w-5 h-5" />
                    Añadir Firmas
              </button>
            </div>
          </div>

              {/* Panel de diseño con propiedades colapsables */}
          <div className="grid grid-cols-12 gap-6">
                <div 
                  className={`${showProperties ? 'col-span-8' : 'col-span-12'} min-h-[600px] bg-white rounded-lg shadow p-4 transition-all duration-300`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    try {
                      const data = JSON.parse(e.dataTransfer.getData('application/json'));
                      if (data.type === 'subject') {
                        const newSection: Section = {
                          id: crypto.randomUUID(),
                          title: data.data.name,
                          type: 'grades',
                          fields: []  // Asegurarnos de que no enviamos campos predefinidos
                        };
                        setSections([...sections, newSection]);
                      } else if (data.type === 'criteriaGroup') {
                        // Si es una plantilla de criterios, actualizar los campos de la sección actual
                        const activeSection = sections.find(s => s.type === 'grades');
                        if (activeSection) {
                          const updatedFields = data.data.map((criterion: Field) => ({
                            ...criterion,
                            id: crypto.randomUUID() // Generar nuevos IDs para evitar conflictos
                          }));
                          updateSectionFields(activeSection.id, updatedFields);
                        }
                      }
                    } catch (error) {
                      console.error('Error al procesar el drop:', error);
                    }
                  }}
                >
              <DndContext
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={sections.map(s => s.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {sections.map((section) => (
                    <DraggableSection 
                      key={section.id} 
                      section={section}
                      onDelete={deleteSection}
                      onUpdateFields={updateSectionFields}
                      onUpdateSection={updateSection}
                      centerConfig={centerConfig}
                      getActiveAcademicYear={getActiveAcademicYear}
                      courses={courses}
                      selectedCourse={selectedCourse}
                      savedGroups={savedGroups}
                      setSavedGroups={setSavedGroups}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </div>

                {/* Panel de propiedades colapsable */}
                {showProperties && (
            <div className="col-span-4 p-4 bg-white rounded-lg shadow">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-lg font-medium">Propiedades</h2>
                      <button
                        onClick={() => setShowProperties(false)}
                        className="p-1 text-gray-500 hover:text-gray-700"
                        title="Ocultar panel de propiedades"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>

                    {/* Asignaturas del curso */}
                    {selectedCourse && (
                      <div className="mb-6 space-y-4">
                        <h3 className="font-medium text-gray-700 text-md">Asignaturas del Curso</h3>
                        <div className="space-y-2">
                          {currentTemplateSubjects.map(subject => (
                            <div 
                              key={subject.id}
                              className="overflow-hidden rounded-lg border"
                              draggable
                              onDragStart={(e) => {
                                e.dataTransfer.setData('application/json', JSON.stringify({
                                  type: 'subject',
                                  data: {
                                    id: subject.id,
                                    name: subject.name,
                                    type: subject.type,
                                    fields: []
                                  }
                                }));
                              }}
                            >
                              <div className="flex items-center p-3 bg-gray-50 hover:bg-gray-100">
                                <div className="flex flex-1 items-center">
                                  <GripVertical className="mr-3 w-4 h-4 text-gray-400" />
                                  <span className="font-medium">{subject.name}</span>
                                  <span className="px-2 py-1 ml-2 text-xs text-gray-500 bg-gray-200 rounded">
                                    {subject.type === 'individual' ? 'Individual' : 'Grupo'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                          {currentTemplateSubjects.length === 0 && (
                            <div className="p-4 text-center text-gray-500">
                              Este curso no tiene asignaturas definidas en su plantilla.
                              Configure las asignaturas en Configuración {'>'} Plantillas de Curso.
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Plantillas de criterios - mostrar siempre */}
                    <div className="space-y-4">
                      <h3 className="font-medium text-gray-700 text-md">Plantillas de Criterios</h3>
                      {savedGroups.length > 0 ? (
                        <div className="space-y-2">
                          {savedGroups.map(group => (
                            <div 
                              key={group.id}
                              className="p-2 bg-white rounded border cursor-move"
                              draggable
                              onDragStart={(e) => {
                                console.log('Iniciando arrastre de plantilla:', group.name);
                                
                                // Asegurarnos de que los criterios tienen la estructura correcta
                                const criteriaData = group.criteria.map(c => ({
                                  id: c.id,
                                  name: c.name,
                                  type: 'select'
                                }));
                                
                                const data = {
                                  type: 'criteria-template',
                                  data: criteriaData
                                };
                                
                                console.log('Datos a transferir:', data);
                                
                                // Establecer los datos en el dataTransfer
                                e.dataTransfer.setData('application/json', JSON.stringify(data));
                                e.dataTransfer.effectAllowed = 'copy';
                                
                                // Añadir una imagen de arrastre para mejorar la experiencia
                                const dragImage = document.createElement('div');
                                dragImage.textContent = group.name;
                                dragImage.style.padding = '8px';
                                dragImage.style.background = '#f3f4f6';
                                dragImage.style.border = '1px solid #d1d5db';
                                dragImage.style.borderRadius = '4px';
                                dragImage.style.position = 'absolute';
                                dragImage.style.top = '-1000px';
                                document.body.appendChild(dragImage);
                                
                                e.dataTransfer.setDragImage(dragImage, 0, 0);
                                
                                // Limpiar el elemento después
                                setTimeout(() => {
                                  document.body.removeChild(dragImage);
                                }, 0);
                              }}
                            >
                              <div className="flex justify-between items-center">
                                <div className="flex items-center">
                                  <GripVertical className="mr-2 w-4 h-4 text-gray-400" />
                                  <span className="text-sm">{group.name}</span>
                                </div>
                                <button
                                  onClick={() => handleDeleteGroup(group.id)}
                                  className="p-1 text-red-400 hover:text-red-600"
                                  title="Eliminar plantilla"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-4 text-center text-gray-500">
                          No hay plantillas guardadas
                        </div>
                      )}
            </div>
          </div>
                )}

                {/* Botón para mostrar el panel de propiedades cuando está oculto */}
                {!showProperties && (
                  <button
                    onClick={() => setShowProperties(true)}
                    className="fixed right-6 bottom-6 p-3 text-white bg-blue-600 rounded-full shadow-lg transition-colors hover:bg-blue-700"
                    title="Mostrar panel de propiedades"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                    </svg>
                  </button>
                )}
              </div>
            </>
          )}

          {/* Barra de estado y guardado (fija en la parte inferior) */}
          <div className="sticky right-0 bottom-0 left-0 z-10 p-4 bg-white border-t shadow-md">
            <div className="flex gap-4 justify-end items-center mx-auto max-w-4xl">
              <button
                onClick={handleSave}
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
                      Guardar Boletín
                    </>
                  )}
                </div>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Modal de confirmación */}
      <ConfirmationModal />
    </div>
  );
} 
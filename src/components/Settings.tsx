import { useState, useEffect } from 'react';
import { BackButton } from './BackButton';
import { InstrumentManager } from './settings/InstrumentManager';
import { LevelManager } from './settings/LevelManager';
import { CourseManager } from './settings/CourseManager';
import { AcademicYearManager } from './settings/AcademicYearManager';
import { Calendar, BookOpen, Music, GraduationCap, FileText, Settings as SettingsIcon } from 'lucide-react';
import { Instrument, Level, Course, AcademicYear, GroupSubject, CourseTemplate, EvaluationCriterion } from '../types';
import {
  getInstruments,
  getLevels,
  getCourses,
  getAcademicYears,
  getGroupSubjects,
  createInstrument,
  updateInstrument,
  deleteInstrument,
  createLevel,
  updateLevel,
  deleteLevel,
  createCourse,
  updateCourse,
  deleteCourse,
  createAcademicYear,
  updateAcademicYear,
  toggleAcademicYear,
  deleteAcademicYear,
  createGroupSubject,
  updateGroupSubject,
  deleteGroupSubject,
  getCourseTemplates,
  createCourseTemplate,
  updateCourseTemplate,
  deleteCourseTemplate,
  getEvaluationCriteria,
  saveEvaluationCriterion,
  updateEvaluationCriterion,
  deleteEvaluationCriterion,
  updateEvaluationCriteriaOrder,
} from '../lib/db/index';
import { GroupSubjectManager } from './settings/GroupSubjectManager';
import { CourseTemplateManager } from './settings/CourseTemplateManager';
import { CenterConfig } from './settings/CenterConfig';
import { EvaluationCriteriaManager } from './settings/EvaluationCriteriaManager';

type SettingsTab = 'academic-year' | 'courses' | 'levels' | 'instruments' | 'group-subjects' | 'course-templates' | 'center-config' | 'evaluation-criteria';

export function Settings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('academic-year');
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [groupSubjects, setGroupSubjects] = useState<GroupSubject[]>([]);
  const [templates, setTemplates] = useState<CourseTemplate[]>([]);
  const [evaluationCriteria, setEvaluationCriteria] = useState<EvaluationCriterion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [
        instrumentsData, 
        levelsData, 
        coursesData, 
        academicYearsData,
        groupSubjectsData,
        templatesData,
        evaluationCriteriaData
      ] = await Promise.all([
        getInstruments(),
        getLevels(),
        getCourses(),
        getAcademicYears(),
        getGroupSubjects(),
        getCourseTemplates(),
        getEvaluationCriteria(),
      ]);
      
      setInstruments(instrumentsData);
      setLevels(levelsData);
      setCourses(coursesData);
      setAcademicYears(academicYearsData);
      setGroupSubjects(groupSubjectsData);
      setTemplates(templatesData);
      setEvaluationCriteria(evaluationCriteriaData);
    } catch (err) {
      setError('Error al cargar los datos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // Handlers para Instrumentos
  const handleAddInstrument = async (name: string) => {
    try {
      const newInstrument = await createInstrument(name);
      setInstruments([...instruments, newInstrument]);
    } catch (err) {
      setError('Error al crear el instrumento');
      console.error(err);
    }
  };

  const handleEditInstrument = async (id: string, name: string) => {
    try {
      await updateInstrument(id, name);
      setInstruments(instruments.map(inst => 
        inst.id === id ? { ...inst, name } : inst
      ));
    } catch (err) {
      setError('Error al actualizar el instrumento');
      console.error(err);
    }
  };

  const handleDeleteInstrument = async (id: string) => {
    try {
      await deleteInstrument(id);
      setInstruments(instruments.filter(inst => inst.id !== id));
    } catch (err) {
      setError('Error al eliminar el instrumento');
      console.error(err);
    }
  };

  // Handlers para Niveles
  const handleAddLevel = async (name: string) => {
    try {
      const newLevel = await createLevel(name);
      setLevels([...levels, newLevel]);
    } catch (err) {
      setError('Error al crear el nivel');
      console.error(err);
    }
  };

  const handleEditLevel = async (id: string, name: string) => {
    try {
      await updateLevel(id, name);
      setLevels(levels.map(level => 
        level.id === id ? { ...level, name } : level
      ));
    } catch (err) {
      setError('Error al actualizar el nivel');
      console.error(err);
    }
  };

  const handleDeleteLevel = async (id: string) => {
    try {
      await deleteLevel(id);
      setLevels(levels.filter(level => level.id !== id));
    } catch (err) {
      setError('Error al eliminar el nivel');
      console.error(err);
    }
  };

  // Handlers para Cursos
  const handleAddCourse = async (name: string, levelId: string, academicYear: string) => {
    try {
      const newCourse = await createCourse(name, levelId, academicYear, null);
      setCourses([...courses, newCourse]);
    } catch (err) {
      setError('Error al crear el curso');
      console.error(err);
    }
  };

  const handleEditCourse = async (id: string, name: string, levelId: string, academicYear: string) => {
    try {
      const currentCourse = courses.find(c => c.id === id);
      await updateCourse(
        id, 
        name, 
        levelId, 
        academicYear,
        currentCourse?.templateId || null
      );
      setCourses(courses.map(course => 
        course.id === id ? { ...course, name, levelId, academicYear } : course
      ));
    } catch (err) {
      setError('Error al actualizar el curso');
      console.error(err);
    }
  };

  const handleDeleteCourse = async (id: string) => {
    try {
      await deleteCourse(id);
      setCourses(courses.filter(course => course.id !== id));
    } catch (err) {
      setError('Error al eliminar el curso');
      console.error(err);
    }
  };

  // Handlers para Años Académicos
  const handleAddAcademicYear = async (name: string) => {
    try {
      const newYear = await createAcademicYear(name);
      setAcademicYears([...academicYears, newYear]);
    } catch (err) {
      setError('Error al crear el año académico');
      console.error(err);
    }
  };

  const handleEditAcademicYear = async (id: string, name: string) => {
    try {
      await updateAcademicYear(id, name);
      setAcademicYears(academicYears.map(year => 
        year.id === id ? { ...year, name } : year
      ));
    } catch (err) {
      setError('Error al actualizar el año académico');
      console.error(err);
    }
  };

  const handleToggleAcademicYear = async (id: string, isActive: boolean) => {
    try {
      await toggleAcademicYear(id, isActive);
      setAcademicYears(academicYears.map(year => 
        year.id === id ? { ...year, isActive } : year
      ));
    } catch (err) {
      setError('Error al cambiar el estado del año académico');
      console.error(err);
    }
  };

  const handleDeleteAcademicYear = async (id: string) => {
    try {
      await deleteAcademicYear(id);
      setAcademicYears(academicYears.filter(year => year.id !== id));
    } catch (err) {
      setError('Error al eliminar el año académico');
      console.error(err);
    }
  };

  // Handlers para Asignaturas Grupales
  const handleAddGroupSubject = async (name: string) => {
    try {
      setLoading(true);
      const newSubject = await createGroupSubject(name);
      setGroupSubjects(prev => [...prev, newSubject]);
      setError(null);
    } catch (err) {
      console.error('Error al crear la asignatura grupal:', err);
      setError('Error al crear la asignatura grupal. Por favor, inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditGroupSubject = async (id: string, name: string) => {
    try {
      setLoading(true);
      await updateGroupSubject(id, name);
      setGroupSubjects(prev => 
        prev.map(subject => subject.id === id ? { ...subject, name } : subject)
      );
      setError(null);
    } catch (err) {
      console.error('Error al actualizar la asignatura grupal:', err);
      setError('Error al actualizar la asignatura grupal. Por favor, inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGroupSubject = async (id: string) => {
    try {
      setLoading(true);
      await deleteGroupSubject(id);
      setGroupSubjects(prev => prev.filter(subject => subject.id !== id));
      setError(null);
    } catch (err) {
      console.error('Error al eliminar la asignatura grupal:', err);
      setError('Error al eliminar la asignatura grupal. Por favor, inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  // Handlers para Plantillas de Curso
  const handleAddTemplate = async (template: Omit<CourseTemplate, 'id' | 'levelName'>) => {
    try {
      setLoading(true);
      const newTemplate = await createCourseTemplate(template);
      setTemplates(prev => [...prev, newTemplate]);
      setError(null);
    } catch (err) {
      console.error('Error al crear la plantilla:', err);
      setError('Error al crear la plantilla. Por favor, inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditTemplate = async (id: string, template: Omit<CourseTemplate, 'id' | 'levelName'>) => {
    try {
      setLoading(true);
      await updateCourseTemplate(id, template);
      const updatedTemplate = { ...template, id, levelName: levels.find(l => l.id === template.levelId)?.name };
      setTemplates(prev => prev.map(t => t.id === id ? updatedTemplate : t));
      setError(null);
    } catch (err) {
      console.error('Error al actualizar la plantilla:', err);
      setError('Error al actualizar la plantilla. Por favor, inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      setLoading(true);
      await deleteCourseTemplate(id);
      setTemplates(prev => prev.filter(t => t.id !== id));
      setError(null);
    } catch (err) {
      console.error('Error al eliminar la plantilla:', err);
      setError('Error al eliminar la plantilla. Por favor, inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyTemplate = async (template: Omit<CourseTemplate, 'id' | 'levelName'>) => {
    try {
      setLoading(true);
      const newTemplate = await createCourseTemplate(template);
      setTemplates(prev => [...prev, newTemplate]);
      setError(null);
    } catch (err) {
      console.error('Error al copiar la plantilla:', err);
      setError('Error al copiar la plantilla. Por favor, inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  // Handlers para Criterios de Evaluación
  const handleAddEvaluationCriterion = async (criterion: Omit<EvaluationCriterion, 'id'>) => {
    try {
      const newCriterion = await saveEvaluationCriterion(criterion);
      setEvaluationCriteria([...evaluationCriteria, newCriterion]);
    } catch (err) {
      setError('Error al crear el criterio de evaluación');
      console.error(err);
    }
  };

  const handleEditEvaluationCriterion = async (id: string, criterion: Partial<EvaluationCriterion>) => {
    try {
      await updateEvaluationCriterion(id, criterion);
      setEvaluationCriteria(criteria => 
        criteria.map(c => c.id === id ? { ...c, ...criterion } : c)
      );
    } catch (err) {
      setError('Error al actualizar el criterio de evaluación');
      console.error(err);
    }
  };

  const handleDeleteEvaluationCriterion = async (id: string) => {
    try {
      await deleteEvaluationCriterion(id);
      setEvaluationCriteria(criteria => criteria.filter(c => c.id !== id));
    } catch (err) {
      setError('Error al eliminar el criterio de evaluación');
      console.error(err);
    }
  };

  const handleReorderEvaluationCriteria = async (newOrder: EvaluationCriterion[]) => {
    try {
      await updateEvaluationCriteriaOrder(newOrder);
      setEvaluationCriteria(newOrder);
    } catch (err) {
      setError('Error al actualizar el orden de los criterios');
      console.error(err);
    }
  };

  const tabs = [
    {
      id: 'center-config',
      name: 'Configuración del Centro',
      icon: SettingsIcon,
      component: <CenterConfig />
    },
    {
      id: 'academic-year',
      name: 'Año Académico',
      icon: Calendar,
      component: (
        <AcademicYearManager
          academicYears={academicYears}
          onAdd={handleAddAcademicYear}
          onEdit={handleEditAcademicYear}
          onToggleActive={handleToggleAcademicYear}
          onDelete={handleDeleteAcademicYear}
        />
      )
    },
    {
      id: 'courses',
      name: 'Cursos',
      icon: BookOpen,
      component: (
        <CourseManager
          courses={courses}
          levels={levels}
          academicYears={academicYears}
          onAdd={handleAddCourse}
          onEdit={handleEditCourse}
          onDelete={handleDeleteCourse}
        />
      )
    },
    {
      id: 'levels',
      name: 'Niveles',
      icon: GraduationCap,
      component: (
        <LevelManager
          levels={levels}
          onAdd={handleAddLevel}
          onEdit={handleEditLevel}
          onDelete={handleDeleteLevel}
        />
      )
    },
    {
      id: 'instruments',
      name: 'Instrumentos',
      icon: Music,
      component: (
        <InstrumentManager
          instruments={instruments}
          onAdd={handleAddInstrument}
          onEdit={handleEditInstrument}
          onDelete={handleDeleteInstrument}
        />
      )
    },
    {
      id: 'group-subjects',
      name: 'Asignaturas Grupales',
      icon: BookOpen,
      component: (
        <GroupSubjectManager
          groupSubjects={groupSubjects}
          onAdd={handleAddGroupSubject}
          onEdit={handleEditGroupSubject}
          onDelete={handleDeleteGroupSubject}
        />
      )
    },
    {
      id: 'course-templates',
      name: 'Plantillas de Curso',
      icon: FileText,
      component: (
        <CourseTemplateManager
          templates={templates}
          levels={levels}
          courses={courses}
          academicYears={academicYears}
          groupSubjects={groupSubjects}
          onAdd={handleAddTemplate}
          onEdit={handleEditTemplate}
          onDelete={handleDeleteTemplate}
          onCopy={handleCopyTemplate}
        />
      )
    },
    {
      id: 'evaluation-criteria',
      name: 'Criterios de Evaluación',
      icon: FileText,
      component: (
        <EvaluationCriteriaManager
          criteria={evaluationCriteria}
          onAdd={handleAddEvaluationCriterion}
          onEdit={handleEditEvaluationCriterion}
          onDelete={handleDeleteEvaluationCriterion}
          onReorder={handleReorderEvaluationCriteria}
        />
      )
    }
  ] as const;

  return (
    <div className="py-6">
      <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
        <div className="mb-6">
          <BackButton />
        </div>
        <h1 className="mb-8 text-2xl font-semibold text-gray-900">Configuración</h1>
        
        <div className="flex gap-6">
          {/* Menú Lateral */}
          <div className="w-64 shrink-0">
            <nav className="space-y-1">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as SettingsTab)}
                  className={`
                    w-full flex items-center px-3 py-2 text-sm font-medium rounded-md
                    ${activeTab === tab.id
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }
                  `}
                >
                  <tab.icon
                    className={`mr-3 h-5 w-5 ${
                      activeTab === tab.id ? 'text-indigo-500' : 'text-gray-400'
                    }`}
                  />
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>

          {/* Contenido Principal */}
          <div className="flex-1">
            <div className="p-6 bg-white rounded-lg shadow">
              {tabs.find(tab => tab.id === activeTab)?.component}
            </div>
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
      </div>
    </div>
  );
}

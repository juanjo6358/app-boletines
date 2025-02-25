import { useState } from 'react';
import { PlusCircle, Pencil, Trash2, Plus, X, Copy, ChevronDown, ChevronRight, ChevronsUpDown, Check } from 'lucide-react';
import { CourseTemplate, Level, GroupSubject, CourseTemplateSubject, Course, AcademicYear } from '../../types';
import { ConfirmDialog } from '../ConfirmDialog';
import { Listbox, Transition } from '@headlessui/react';

interface CourseTemplateManagerProps {
  templates: CourseTemplate[];
  levels: Level[];
  courses: Course[];
  academicYears: AcademicYear[];
  groupSubjects: GroupSubject[];
  onAdd: (template: Omit<CourseTemplate, 'id' | 'levelName'>) => void;
  onEdit: (id: string, template: Omit<CourseTemplate, 'id' | 'levelName'>) => void;
  onDelete: (id: string) => void;
  onCopy: (template: Omit<CourseTemplate, 'id' | 'levelName'>) => void;
}

interface FormSubject {
  id?: string;
  name: string;
  type: 'individual' | 'group';
  isRequired: boolean;
}

interface TemplatesByLevel {
  [levelId: string]: CourseTemplate[];
}

// Componente Select personalizado
function CustomSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { id: string; name: string }[];
  placeholder: string;
}) {
  return (
    <Listbox value={value} onChange={onChange}>
      {({ open }) => (
        <div className="relative">
          <Listbox.Button className="relative py-2 pr-10 pl-3 w-full text-left bg-white rounded-md border border-gray-300 shadow-sm cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500">
            <span className={`block truncate ${!value ? 'text-gray-500' : 'text-gray-900'}`}>
              {value ? options.find(opt => opt.id === value)?.name : placeholder}
            </span>
            <span className="flex absolute inset-y-0 right-0 items-center pr-2 pointer-events-none">
              <ChevronsUpDown className="w-5 h-5 text-gray-400" aria-hidden="true" />
            </span>
          </Listbox.Button>

          <Transition
            show={open}
            as="div"
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
            className="overflow-auto absolute z-10 py-1 mt-1 w-full max-h-60 text-base bg-white rounded-md ring-1 ring-black ring-opacity-5 shadow-lg focus:outline-none sm:text-sm"
          >
            <Listbox.Options static className="overflow-auto max-h-60">
              {options.map((option) => (
                <Listbox.Option
                  key={option.id}
                  className={({ active }) =>
                    `relative cursor-pointer select-none py-2 pl-10 pr-4 ${
                      active ? 'bg-indigo-50 text-indigo-900' : 'text-gray-900'
                    }`
                  }
                  value={option.id}
                >
                  {({ selected, active }) => (
                    <>
                      <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                        {option.name}
                      </span>
                      {selected ? (
                        <span
                          className={`absolute inset-y-0 left-0 flex items-center pl-3 ${
                            active ? 'text-indigo-600' : 'text-indigo-600'
                          }`}
                        >
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
}

export function CourseTemplateManager({
  templates,
  levels,
  courses,
  academicYears,
  groupSubjects,
  onAdd,
  onEdit,
  onDelete,
  onCopy,
}: CourseTemplateManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<CourseTemplate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copyingTemplate, setCopyingTemplate] = useState<CourseTemplate | null>(null);
  const [copyFormData, setCopyFormData] = useState({
    name: '',
    levelId: '',
    courseId: '',
    academicYear: '',
  });

  const [formData, setFormData] = useState({
    name: '',
    levelId: '',
    courseId: '',
    academicYear: '',
    subjects: [] as FormSubject[]
  });

  const [expandedLevels, setExpandedLevels] = useState<Set<string>>(new Set());

  // Organizar templates por nivel
  const templatesByLevel = templates.reduce((acc: TemplatesByLevel, template) => {
    if (!acc[template.levelId]) {
      acc[template.levelId] = [];
    }
    acc[template.levelId].push(template);
    return acc;
  }, {});

  const toggleLevel = (levelId: string) => {
    const newExpanded = new Set(expandedLevels);
    if (newExpanded.has(levelId)) {
      newExpanded.delete(levelId);
    } else {
      newExpanded.add(levelId);
    }
    setExpandedLevels(newExpanded);
  };

  const getActiveAcademicYear = () => {
    return academicYears.find(year => year.isActive)?.name || '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.levelId || !formData.courseId) {
      setError('Por favor, completa todos los campos obligatorios');
      return;
    }

    if (formData.subjects.length === 0) {
      setError('Debes añadir al menos una asignatura');
      return;
    }

    const template = {
      name: formData.name.trim(),
      levelId: formData.levelId,
      courseId: formData.courseId,
      academicYear: getActiveAcademicYear(),
      subjects: formData.subjects.map(subject => ({
        ...subject,
        id: subject.id || crypto.randomUUID()
      })) as CourseTemplateSubject[]
    };

    if (editingId) {
      onEdit(editingId, template);
    } else {
      onAdd(template);
    }

    setFormData({ name: '', levelId: '', courseId: '', academicYear: '', subjects: [] });
    setIsAdding(false);
    setEditingId(null);
    setError(null);
  };

  const handleEdit = (template: CourseTemplate) => {
    setFormData({
      name: template.name,
      levelId: template.levelId,
      courseId: template.courseId,
      academicYear: template.academicYear,
      subjects: template.subjects
    });
    setEditingId(template.id);
    setIsAdding(true);
  };

  const addSubject = (type: 'individual' | 'group') => {
    setFormData(prev => ({
      ...prev,
      subjects: [...prev.subjects, { name: '', type, isRequired: true }]
    }));
  };

  const removeSubject = (index: number) => {
    setFormData(prev => ({
      ...prev,
      subjects: prev.subjects.filter((_, i) => i !== index)
    }));
  };

  const handleCopy = (template: CourseTemplate) => {
    setCopyingTemplate(template);
    setCopyFormData({
      name: `${template.name} (copia)`,
      levelId: template.levelId,
      courseId: template.courseId,
      academicYear: template.academicYear,
    });
  };

  const handleConfirmCopy = () => {
    if (copyingTemplate && copyFormData.name.trim() && copyFormData.levelId) {
      onCopy({
        name: copyFormData.name.trim(),
        levelId: copyFormData.levelId,
        courseId: copyFormData.courseId,
        academicYear: copyFormData.academicYear,
        subjects: copyingTemplate.subjects.map(s => ({
          ...s,
          id: crypto.randomUUID()
        }))
      });
      setCopyingTemplate(null);
      setCopyFormData({ name: '', levelId: '', courseId: '', academicYear: '' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex justify-between items-center pb-4 border-b">
        <h2 className="text-xl font-semibold text-gray-900">Plantillas de Curso</h2>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
            title="Añadir nueva plantilla"
          >
            <PlusCircle className="mr-2 w-5 h-5" />
            Nueva Plantilla
          </button>
        )}
      </div>

      {/* Contenedor principal */}
      <div className="bg-white rounded-lg shadow">
        {/* Formulario de añadir/editar */}
        {isAdding && (
          <form onSubmit={handleSubmit} className="p-4 space-y-4 bg-gray-50 rounded-md">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="templateName" className="block text-sm font-medium text-gray-700">
                  Nombre de la Plantilla
                </label>
                <input
                  id="templateName"
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="block mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder="Introduce el nombre de la plantilla"
                  aria-label="Nombre de la plantilla"
                />
              </div>
              <div>
                <label htmlFor="levelSelect" className="block text-sm font-medium text-gray-700">
                  Nivel
                </label>
                <div className="mt-1">
                  <CustomSelect
                    value={formData.levelId}
                    onChange={(value) => setFormData(prev => ({ ...prev, levelId: value }))}
                    options={levels}
                    placeholder="Selecciona un nivel"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="courseSelect" className="block text-sm font-medium text-gray-700">
                  Curso
                </label>
                <select
                  id="courseSelect"
                  value={formData.courseId}
                  onChange={(e) => setFormData(prev => ({ ...prev, courseId: e.target.value }))}
                  className="block mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="">Selecciona un curso</option>
                  {courses.map(course => (
                    <option key={course.id} value={course.id}>
                      {course.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Año Académico
                </label>
                <div className="mt-1 p-2 bg-gray-50 rounded-md border border-gray-300">
                  <span className="text-gray-700">{getActiveAcademicYear()}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium text-gray-700">Asignaturas</h3>
                <div className="space-x-2">
                  <button
                    type="button"
                    onClick={() => addSubject('individual')}
                    className="inline-flex items-center px-3 py-1 text-sm text-indigo-600 rounded-md border border-indigo-600 hover:bg-indigo-50"
                    title="Añadir asignatura individual"
                  >
                    <Plus className="mr-1 w-4 h-4" />
                    Individual
                  </button>
                  <button
                    type="button"
                    onClick={() => addSubject('group')}
                    className="inline-flex items-center px-3 py-1 text-sm text-indigo-600 rounded-md border border-indigo-600 hover:bg-indigo-50"
                    title="Añadir asignatura grupal"
                  >
                    <Plus className="mr-1 w-4 h-4" />
                    Grupal
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {formData.subjects.map((subject, index) => (
                  <div key={index} className="flex gap-3 items-center p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
                    <div className="flex-1">
                      <CustomSelect
                        value={subject.name}
                        onChange={(value) => {
                          const newSubjects = [...formData.subjects];
                          newSubjects[index] = { ...subject, name: value };
                          setFormData(prev => ({ ...prev, subjects: newSubjects }));
                        }}
                        options={
                          subject.type === 'group'
                            ? groupSubjects.map(gs => ({ id: gs.name, name: gs.name }))
                            : [{ id: 'Instrumento', name: 'Instrumento' }]
                        }
                        placeholder={
                          subject.type === 'individual'
                            ? '-- Selecciona asignatura individual --'
                            : '-- Selecciona asignatura grupal --'
                        }
                      />
                      <div className="flex gap-2 items-center mt-1 text-xs text-gray-500">
                        <span className={`
                          px-2 py-0.5 rounded-full
                          ${subject.type === 'individual' 
                            ? 'bg-blue-50 text-blue-700' 
                            : 'bg-green-50 text-green-700'
                          }
                        `}>
                          {subject.type === 'individual' ? 'Individual' : 'Grupal'}
                        </span>
                      </div>
                    </div>

                    <label className="flex items-center px-3 py-2 whitespace-nowrap bg-gray-50 rounded-md">
                      <input
                        type="checkbox"
                        checked={subject.isRequired}
                        onChange={e => {
                          const newSubjects = [...formData.subjects];
                          newSubjects[index] = { ...subject, isRequired: e.target.checked };
                          setFormData(prev => ({ ...prev, subjects: newSubjects }));
                        }}
                        className="text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                      />
                      <span className="ml-2 text-sm text-gray-600">Obligatoria</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => removeSubject(index)}
                      className="p-2 text-red-600 rounded-full transition-colors hover:text-red-900 hover:bg-red-50"
                      title={`Eliminar asignatura ${subject.name || 'sin nombre'}`}
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsAdding(false);
                  setEditingId(null);
                  setFormData({ name: '', levelId: '', courseId: '', academicYear: '', subjects: [] });
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white rounded-md border border-gray-300 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
              >
                {editingId ? 'Guardar Cambios' : 'Crear Plantilla'}
              </button>
            </div>
          </form>
        )}

        {/* Lista de plantillas por nivel */}
        <div className="p-4 space-y-2">
          {levels.map(level => {
            const levelTemplates = templatesByLevel[level.id] || [];
            const isExpanded = expandedLevels.has(level.id);

            if (levelTemplates.length === 0) return null;

            return (
              <div key={level.id} className="overflow-hidden rounded-lg border">
                <button
                  onClick={() => toggleLevel(level.id)}
                  className="flex justify-between items-center p-4 w-full bg-gray-50 hover:bg-gray-100"
                >
                  <div className="flex items-center">
                    {isExpanded ? (
                      <ChevronDown className="mr-2 w-5 h-5 text-gray-500" />
                    ) : (
                      <ChevronRight className="mr-2 w-5 h-5 text-gray-500" />
                    )}
                    <h3 className="text-lg font-medium text-gray-900">
                      {level.name}
                      <span className="ml-2 text-sm text-gray-500">
                        ({levelTemplates.length} plantilla{levelTemplates.length !== 1 ? 's' : ''})
                      </span>
                    </h3>
                  </div>
                </button>

                {isExpanded && (
                  <ul className="divide-y divide-gray-200">
                    {levelTemplates.map(template => (
                      <li key={template.id} className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="text-lg font-medium text-gray-900">{template.name}</h4>
                            <ul className="mt-2 space-y-1">
                              {template.subjects.map(subject => (
                                <li key={subject.id} className="text-sm text-gray-600">
                                  • {subject.name}
                                  {!subject.isRequired && ' (Opcional)'}
                                  <span className="text-gray-400">
                                    {' - '}{subject.type === 'individual' ? 'Individual' : 'Grupal'}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleCopy(template)}
                              className="text-indigo-600 hover:text-indigo-900"
                              title={`Copiar plantilla ${template.name}`}
                            >
                              <Copy className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleEdit(template)}
                              className="text-indigo-600 hover:text-indigo-900"
                              title={`Editar plantilla ${template.name}`}
                            >
                              <Pencil className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(template)}
                              className="text-red-600 hover:text-red-900"
                              title={`Eliminar plantilla ${template.name}`}
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Diálogos de confirmación */}
      <ConfirmDialog
        isOpen={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => {
          if (deleteConfirm) {
            onDelete(deleteConfirm.id);
            setDeleteConfirm(null);
          }
        }}
        title="Eliminar plantilla"
        message={`¿Estás seguro de que quieres eliminar la plantilla "${deleteConfirm?.name}"? Esta acción no se puede deshacer.`}
      />

      <ConfirmDialog
        isOpen={copyingTemplate !== null}
        onClose={() => setCopyingTemplate(null)}
        onConfirm={handleConfirmCopy}
        title="Copiar plantilla"
        confirmText="Copiar"
        cancelText="Cancelar"
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="copyName" className="block text-sm font-medium text-gray-700">
              Nombre de la nueva plantilla
            </label>
            <input
              id="copyName"
              type="text"
              value={copyFormData.name}
              onChange={e => setCopyFormData(prev => ({ ...prev, name: e.target.value }))}
              className="block mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label htmlFor="copyLevel" className="block text-sm font-medium text-gray-700">
              Nivel
            </label>
            <select
              id="copyLevel"
              value={copyFormData.levelId}
              onChange={e => setCopyFormData(prev => ({ ...prev, levelId: e.target.value }))}
              className="block mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="">Selecciona un nivel</option>
              {levels.map(level => (
                <option key={level.id} value={level.id}>
                  {level.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </ConfirmDialog>
    </div>
  );
} 
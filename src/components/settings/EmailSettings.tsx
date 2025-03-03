import { useState, useEffect } from 'react';
import { Save, Trash2, Check, ChevronsUpDown, Pencil } from 'lucide-react';
import { RichTextEditor } from '../common/RichTextEditor';
import { 
  getEmailTemplates,
  saveEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate
} from '../../lib/db';
import { EmailTemplate } from '../../types/email';
import { toast } from 'react-toastify';
import * as Select from '@radix-ui/react-select';

export function EmailSettings() {
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [originalTemplate, setOriginalTemplate] = useState<EmailTemplate | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [editorRef, setEditorRef] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [subjectInputRef, setSubjectInputRef] = useState<HTMLInputElement | null>(null);
  const [lastFocused, setLastFocused] = useState<'subject' | 'body'>('body');

  useEffect(() => {
    loadEmailTemplates();
  }, []);

  useEffect(() => {
    if (selectedTemplate && originalTemplate) {
      const hasTemplateChanges = 
        selectedTemplate.name !== originalTemplate.name ||
        selectedTemplate.subject !== originalTemplate.subject ||
        selectedTemplate.body !== originalTemplate.body ||
        selectedTemplate.isDefault !== originalTemplate.isDefault;
      setHasChanges(hasTemplateChanges);
    }
  }, [selectedTemplate, originalTemplate]);

  const loadEmailTemplates = async () => {
    try {
      const templates = await getEmailTemplates();
      setEmailTemplates(templates);
      
      // Si hay plantillas, seleccionar la predeterminada o la primera
      if (templates.length > 0) {
        const defaultTemplate = templates.find(t => t.isDefault) || templates[0];
        setSelectedTemplate({ ...defaultTemplate });
        setOriginalTemplate({ ...defaultTemplate });
        setHasChanges(false);
      } else {
        // Si no hay plantillas, crear una por defecto
        const defaultTemplate = {
          id: '',
          name: 'Boletín de Calificaciones',
          subject: 'Boletín de Calificaciones',
          body: `Estimado/a [NOMBRE_ALUMNO],

Adjunto encontrará el boletín de calificaciones correspondiente al curso [CURSO].

Saludos cordiales,
[CENTRO]`,
          isDefault: true
        };
        setSelectedTemplate(defaultTemplate);
        setOriginalTemplate(defaultTemplate);
        setHasChanges(true);
      }
      return templates;
    } catch (error) {
      console.error('Error al cargar las plantillas:', error);
      setError('Error al cargar las plantillas');
      return [];
    }
  };

  const handleListboxTemplateSelect = (templateId: string) => {
    if (templateId === 'none') {
      const emptyTemplate = {
        id: '',
        name: '',
        subject: '',
        body: '',
        isDefault: false
      };
      setSelectedTemplate(emptyTemplate);
      setOriginalTemplate(emptyTemplate);
      setHasChanges(true);
    } else {
      const template = emailTemplates.find(t => t.id === templateId);
      if (template) {
        setSelectedTemplate({ ...template });
        setOriginalTemplate({ ...template });
        setHasChanges(false);
      }
    }
  };

  const handleSaveTemplate = async () => {
    if (!selectedTemplate?.name || !selectedTemplate?.subject || !selectedTemplate?.body) {
      toast.error('Por favor, completa todos los campos obligatorios');
      return;
    }

    try {
      setIsSaving(true);
      const templateToSave = {
        name: selectedTemplate.name,
        subject: selectedTemplate.subject,
        body: selectedTemplate.body,
        isDefault: selectedTemplate.isDefault
      };

      if (selectedTemplate.isDefault) {
        const updatedTemplates = emailTemplates.map(template => ({
          ...template,
          isDefault: false
        }));
        
        for (const template of updatedTemplates) {
          if (template.id !== selectedTemplate.id) {
            await updateEmailTemplate(template.id, { isDefault: false });
          }
        }
      }

      if (selectedTemplate.id) {
        await updateEmailTemplate(selectedTemplate.id, templateToSave);
      } else {
        const newTemplate = await saveEmailTemplate(templateToSave);
        setSelectedTemplate(newTemplate);
        setOriginalTemplate(newTemplate);
      }

      await loadEmailTemplates();
      setHasChanges(false);
      toast.success('Plantilla guardada correctamente');
    } catch (error) {
      console.error('Error al guardar la plantilla:', error);
      setError('Error al guardar la plantilla. Por favor, inténtalo de nuevo.');
      toast.error('Error al guardar la plantilla');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      await deleteEmailTemplate(templateId);
      await loadEmailTemplates();
      toast.success('Plantilla eliminada correctamente', { autoClose: 5000 });
      
      // Si la plantilla eliminada era la seleccionada, limpiar la selección
      if (selectedTemplate?.id === templateId) {
        const remainingTemplates = emailTemplates.filter(t => t.id !== templateId);
        if (remainingTemplates.length > 0) {
          setSelectedTemplate({ ...remainingTemplates[0] });
          setOriginalTemplate({ ...remainingTemplates[0] });
        } else {
          setSelectedTemplate(null);
          setOriginalTemplate(null);
        }
      }
    } catch (error) {
      console.error('Error al eliminar la plantilla:', error);
      let errorMessage = 'Error al eliminar la plantilla';
      
      if (error instanceof Error) {
        if (error.message.includes('FOREIGN KEY constraint failed')) {
          errorMessage = 'No se puede eliminar la plantilla porque está siendo utilizada por una configuración de correo';
        } else {
          errorMessage = `Error al eliminar la plantilla: ${error.message}`;
        }
      }
      
      toast.error(errorMessage, { autoClose: 5000 });
    }
  };

  // Función para insertar variable
  const insertVariable = (variable: string) => {
    if (lastFocused === 'subject' && subjectInputRef) {
      const start = subjectInputRef.selectionStart || 0;
      const end = subjectInputRef.selectionEnd || 0;
      const currentValue = selectedTemplate?.subject || '';
      const newValue = currentValue.substring(0, start) + variable + currentValue.substring(end);
      
      setSelectedTemplate(prev => 
        prev ? { ...prev, subject: newValue } : {
          id: '',
          name: '',
          subject: newValue,
          body: '',
          isDefault: true
        }
      );

      // Restaurar el cursor después de la variable insertada
      setTimeout(() => {
        if (subjectInputRef) {
          const newPosition = start + variable.length;
          subjectInputRef.setSelectionRange(newPosition, newPosition);
          subjectInputRef.focus();
        }
      }, 0);
    } else if (lastFocused === 'body' && editorRef) {
      editorRef.commands.insertContent(variable);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-4 text-lg font-medium text-gray-900">Plantillas de Correo Electrónico</h2>

        {/* Plantillas de correo */}
        <div className="p-4 bg-white rounded-lg border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium text-md">Plantillas</h3>
            <div className="flex gap-2 items-center">
              <label htmlFor="templateSelect" className="sr-only">
                Seleccionar plantilla
              </label>
              <div className="relative mt-1">
                <Select.Root value={selectedTemplate?.id || 'none'} onValueChange={handleListboxTemplateSelect}>
                  <Select.Trigger className="relative py-2 pr-10 pl-3 w-full text-left bg-white rounded-md border border-gray-300 cursor-default focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                    <Select.Value placeholder="Seleccionar plantilla" />
                    <Select.Icon className="flex absolute inset-y-0 right-0 items-center pr-2">
                      <ChevronsUpDown className="w-5 h-5 text-gray-400" aria-hidden="true" />
                    </Select.Icon>
                  </Select.Trigger>
                  <Select.Portal>
                    <Select.Content className="z-50 min-w-[8rem] overflow-hidden rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5">
                      <Select.Viewport className="p-1">
                        <Select.Item
                          value="none"
                          className="relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-indigo-100 focus:text-indigo-900 data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                        >
                          <Select.ItemText>Nueva plantilla</Select.ItemText>
                          <Select.ItemIndicator className="inline-flex absolute left-2 items-center">
                            <Check className="w-4 h-4" />
                          </Select.ItemIndicator>
                        </Select.Item>
                        {emailTemplates.map((template) => (
                          <Select.Item
                            key={template.id}
                            value={template.id}
                            className="relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-indigo-100 focus:text-indigo-900 data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                          >
                            <Select.ItemText>{template.name || template.subject}</Select.ItemText>
                            <Select.ItemIndicator className="inline-flex absolute left-2 items-center">
                              <Check className="w-4 h-4" />
                            </Select.ItemIndicator>
                          </Select.Item>
                        ))}
                      </Select.Viewport>
                    </Select.Content>
                  </Select.Portal>
                </Select.Root>
              </div>
              {selectedTemplate?.id && !selectedTemplate.isDefault && (
                <button
                  onClick={() => handleDeleteTemplate(selectedTemplate.id)}
                  className="p-1 text-red-600 rounded hover:bg-red-50"
                  title="Eliminar plantilla"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          
          {/* Lista de plantillas existentes */}
          <div className="mt-4">
            <h4 className="mb-2 text-sm font-medium text-gray-700">Plantillas guardadas</h4>
            <div className="space-y-2">
              {emailTemplates.map((template) => (
                <div
                  key={template.id}
                  className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex-1">
                    <div className="flex gap-2 items-center">
                      <span className="text-sm font-medium text-gray-900">
                        {template.name || template.subject}
                      </span>
                      {template.isDefault && (
                        <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">
                          Por defecto
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-gray-500 line-clamp-2">
                      {template.subject}
                    </p>
                  </div>
                  <div className="flex gap-2 items-center">
                    <button
                      onClick={() => {
                        setSelectedTemplate({ ...template });
                        setOriginalTemplate({ ...template });
                        setHasChanges(false);
                      }}
                      className="p-1 text-indigo-600 rounded hover:bg-indigo-50"
                      title="Editar plantilla"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    {!template.isDefault && (
                      <button
                        onClick={() => handleDeleteTemplate(template.id)}
                        className="p-1 text-red-600 rounded hover:bg-red-50"
                  title="Eliminar plantilla"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="mt-8 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Nombre de la plantilla
              </label>
              <input
                type="text"
                value={selectedTemplate?.name || ''}
                onChange={e => setSelectedTemplate(prev => 
                  prev ? { ...prev, name: e.target.value } : {
                    id: '',
                    name: e.target.value,
                    subject: '',
                    body: '',
                    isDefault: false
                  }
                )}
                placeholder="Ej: Plantilla de boletín trimestral"
                className="block mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Asunto
              </label>
              <input
                type="text"
                ref={setSubjectInputRef}
                value={selectedTemplate?.subject || ''}
                onFocus={() => setLastFocused('subject')}
                onChange={e => setSelectedTemplate(prev => 
                  prev ? { ...prev, subject: e.target.value } : {
                    id: '',
                    name: '',
                    subject: e.target.value,
                    body: '',
                    isDefault: false
                  }
                )}
                placeholder="Ej: Boletín de calificaciones - [NOMBRE_ALUMNO]"
                className="block mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Cuerpo del mensaje
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                <button
                  onClick={() => insertVariable('[NOMBRE_ALUMNO]')}
                  className="px-2 py-1 text-xs text-indigo-700 bg-indigo-50 rounded-md border border-indigo-200 hover:bg-indigo-100"
                >
                  Nombre del alumno
                </button>
                <button
                  onClick={() => insertVariable('[CURSO]')}
                  className="px-2 py-1 text-xs text-indigo-700 bg-indigo-50 rounded-md border border-indigo-200 hover:bg-indigo-100"
                >
                  Curso
                </button>
                <button
                  onClick={() => insertVariable('[CENTRO]')}
                  className="px-2 py-1 text-xs text-indigo-700 bg-indigo-50 rounded-md border border-indigo-200 hover:bg-indigo-100"
                >
                  Centro
                </button>
                <button
                  onClick={() => insertVariable('[FECHA]')}
                  className="px-2 py-1 text-xs text-indigo-700 bg-indigo-50 rounded-md border border-indigo-200 hover:bg-indigo-100"
                >
                  Fecha actual
                </button>
              </div>
              <div className="max-w-none prose">
                <RichTextEditor
                  initialValue={selectedTemplate?.body || ''}
                  onChange={(content: string) => setSelectedTemplate(prev => 
                    prev ? { ...prev, body: content } : {
                      id: '',
                      name: '',
                      subject: 'Boletín de Calificaciones',
                      body: content,
                      isDefault: false
                    }
                  )}
                  onEditorReady={editor => {
                    setEditorRef(editor);
                    editor.on('focus', () => setLastFocused('body'));
                  }}
                  placeholder="Escribe el contenido del correo..."
                  showToolbar={true}
                />
              </div>
            </div>

            <div className="flex justify-between">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={selectedTemplate?.isDefault || false}
                  onChange={(e) => {
                    if (selectedTemplate) {
                      setSelectedTemplate({
                        ...selectedTemplate,
                        isDefault: e.target.checked
                      });
                      setHasChanges(true);
                    }
                  }}
                  className="mr-2 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                />
                <label htmlFor="isDefault" className="text-sm text-gray-700">
                  Establecer como plantilla por defecto
                </label>
              </div>
              <button
                onClick={handleSaveTemplate}
                className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                  hasChanges 
                    ? 'text-white bg-indigo-600 hover:bg-indigo-700' 
                    : 'text-gray-700 bg-gray-100'
                } disabled:opacity-50`}
                disabled={!selectedTemplate?.name || !selectedTemplate?.subject || !selectedTemplate?.body || isSaving || !hasChanges}
              >
                <Save className="mr-2 w-4 h-4" />
                {isSaving ? 'Guardando...' : hasChanges ? (selectedTemplate?.id ? 'Actualizar plantilla' : 'Guardar plantilla') : 'Guardado'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-2 text-sm text-red-600">
          {error}
        </div>
      )}
    </div>
  );
} 
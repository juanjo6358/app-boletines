import { useState, useEffect, Fragment, useRef } from 'react';
import { ChevronLeft, ChevronRight, Plus, Trash2, X, Mail, Download } from 'lucide-react';
import { BackButton } from '../BackButton';
import { getCourses, getStudents, getReportCard, getStudentGrades, saveStudentGrades, getEvaluationCriteria, verifyTemplateAssignment, getTeacherSubjects } from '../../lib/db';
import { Course, Student, Section, ReportCardState, Field, EvaluationCriterion, EmailTemplate } from '../../types/index';
import { Listbox, Transition, Portal } from '@headlessui/react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { RichTextEditor } from '../common/RichTextEditor';
import { useAuth } from '../../lib/auth';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { pdf } from '@react-pdf/renderer';
import { toast } from 'react-toastify';
import * as Dialog from '@radix-ui/react-dialog';
import { 
  getEmailTemplates,
  getCenterConfig
} from '../../lib/db';

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

interface SignatureData {
  teacherSignature?: string;
  directorSignature?: string;
}

// Añadir el componente ConfirmationModal
interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, onClose, onConfirm }) => {
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

// Extender la interfaz Student para incluir parentEmail
interface StudentWithParent extends Student {
  parentEmail?: string;
}

// Interfaz para el modal de correo electrónico
interface EmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  courses: Course[];
  selectedStudent: Student | null;
  onSend: (
    recipients: string[], 
    subject: string, 
    body: string, 
    attachments?: { filename: string; content: string; contentType: string }[]
  ) => Promise<boolean>;
  handleDownloadPDF: (student?: Student) => Promise<string>;
  students: Student[];
  grades: { [studentId: string]: GradeData };
  addToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

// Componente Modal de Correo Electrónico
const EmailModal = ({ 
  isOpen, 
  onClose, 
  courses, 
  selectedStudent, 
  onSend, 
  handleDownloadPDF, 
  students,
  addToast 
}: EmailModalProps) => {
  const [recipients, setRecipients] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [body, setBody] = useState<string>('');
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [sendMode, setSendMode] = useState<'individual' | 'course'>('individual');
  const [pdfPreview, setPdfPreview] = useState<string>('');
  const [selectedCourse, setSelectedCourse] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, selectedStudent]);

  // Función auxiliar para reemplazar variables una sola vez

  const loadData = async () => {
    try {
      setIsSending(true);
      const emailTemplates = await getEmailTemplates();
      setTemplates(emailTemplates);

      // Si hay un estudiante seleccionado, prellenar los campos
      if (selectedStudent) {
        // Buscar el curso del estudiante para mostrar el nivel
        const studentCourse = courses.find(c => c.id === selectedStudent.courseId);
        let courseInfo = studentCourse ? studentCourse.name : 'Curso desconocido';
        
        // Añadir el nivel si está disponible
        if (studentCourse && studentCourse.levelId) {
          const levelName = studentCourse.levelName || 'Nivel desconocido';
          courseInfo = `${levelName} - ${courseInfo}`;
        }
        
        // Recopilar todos los correos disponibles
        const emailAddresses: string[] = [];
        
        // Añadir correo del alumno si existe
        if ((selectedStudent as StudentWithParent).email) {
          emailAddresses.push((selectedStudent as StudentWithParent).email!);
        }
        
        // Añadir correo de los padres si existe
        if ((selectedStudent as StudentWithParent).parentEmail) {
          emailAddresses.push((selectedStudent as StudentWithParent).parentEmail!);
        }
        
        // Establecer los destinatarios
        setRecipients(emailAddresses.join(', '));
        setSelectedCourse(selectedStudent.courseId);
        
        // Prellenar asunto con información del estudiante
        setSubject(`Boletín de notas de ${selectedStudent.firstName} ${selectedStudent.lastName}`);
        
        // Prellenar cuerpo con información básica
        const defaultBody = `
          <p>Estimados padres/tutores de ${selectedStudent.firstName} ${selectedStudent.lastName},</p>
          <p>Adjunto encontrarán el boletín de notas correspondiente a ${courseInfo}.</p>
          <p>Para cualquier consulta, no duden en contactarnos.</p>
          <p>Atentamente,</p>
          <p>El equipo docente</p>
        `;
        
        setBody(defaultBody);

        if (sendMode === 'individual') {
          // Generar vista previa del PDF solo en modo individual
          const pdfBase64 = await handleDownloadPDF();
          setPdfPreview(`data:application/pdf;base64,${pdfBase64}`);
        }
      }
    } catch (error) {
      console.error('Error al cargar datos:', error);
      toast.error('Error al cargar las plantillas de correo');
    } finally {
      setIsSending(false);
    }
  };

  const handleSend = async () => {
    try {
      setIsSending(true);
  
      // Obtener la plantilla seleccionada si existe
      let templateSubject = subject;
      let templateBody = body;
  
      if (selectedTemplate) {
        const template = templates.find(t => t.id === selectedTemplate);
        if (template) {
          templateSubject = template.subject;
          templateBody = template.body;
        }
      }
  
      if (sendMode === 'individual') {
        const pdfBase64 = await handleDownloadPDF(selectedStudent || undefined);
        if (!pdfBase64) {
          throw new Error('No se pudo generar el PDF');
        }
  
        const attachment = {
          filename: `boletin_${selectedStudent?.firstName}_${selectedStudent?.lastName}.pdf`,
          content: pdfBase64,
          contentType: 'application/pdf',
          encoding: 'base64'
        };
  
        const success = await onSend(
          recipients.split(',').map(email => email.trim()),
          subject,
          body,
          [attachment]
        );
  
        if (success) {
          onClose();
          addToast('Proceso completado: 1 correo enviado correctamente', 'success');
        }
      } else {
        // Envío por curso
        const studentsInCourse = students.filter(s => s.courseId === selectedCourse) as StudentWithParent[];
        let successCount = 0;
        let errorCount = 0;
  
        // Obtener la configuración del centro
        let centerName = 'Centro de Música';
        try {
          const config = await getCenterConfig();
          if (config) {
            centerName = config.name;
          }
        } catch (err) {
          console.error('Error al obtener la configuración del centro:', err);
        }
  
        // Procesar los correos en segundo plano
        onClose(); // Cerrar el modal inmediatamente
  
        // Procesar estudiantes secuencialmente para evitar problemas de memoria
        for (const student of studentsInCourse) {
          try {
            const studentEmails = [student.email, student.parentEmail].filter(Boolean) as string[];
            if (studentEmails.length === 0) {
              errorCount++;
              continue;
            }
  
            // Obtener el curso del estudiante
            const studentCourse = courses.find(c => c.id === student.courseId);
            let courseInfo = studentCourse ? studentCourse.name : 'Curso desconocido';
            
            // Añadir el nivel si está disponible
            if (studentCourse && studentCourse.levelName) {
              courseInfo = `${studentCourse.levelName} - ${courseInfo}`;
            }
  
            // Personalizar el asunto y cuerpo para cada estudiante
            const replacements = {
              '[NOMBRE_ALUMNO]': `${student.firstName} ${student.lastName}`,
              '[CURSO]': courseInfo,
              '[CENTRO]': centerName,
              '[FECHA]': new Date().toLocaleDateString('es-ES', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })
            };
  
            // Procesar el asunto y cuerpo usando los reemplazos y la plantilla
            let personalizedSubject = templateSubject;
            let personalizedBody = templateBody;
  
            // Reemplazar todas las variables en el asunto y cuerpo
            Object.entries(replacements).forEach(([key, value]) => {
              const regex = new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
              personalizedSubject = personalizedSubject.replace(regex, value);
              personalizedBody = personalizedBody.replace(regex, value);
            });
  
            // Generar PDF específico para este estudiante
            console.log(`Generando PDF para ${student.firstName} ${student.lastName}...`);
            const pdfBase64 = await handleDownloadPDF(student);
            
            if (!pdfBase64) {
              throw new Error(`No se pudo generar el PDF para ${student.firstName} ${student.lastName}`);
            }
  
            // Verificar el PDF antes de enviarlo
            if (!pdfBase64.startsWith('JVBERi0')) {
              throw new Error(`PDF inválido generado para ${student.firstName} ${student.lastName}`);
            }
  
            // Usar la misma estructura de attachment que en el envío individual
            const attachment = {
              filename: `boletin_${student.firstName}_${student.lastName}.pdf`,
              content: pdfBase64,
              contentType: 'application/pdf',
              encoding: 'base64'
            };
  
            const success = await onSend(
              studentEmails,
              personalizedSubject,
              personalizedBody,
              [attachment]
            );
  
            if (success) {
              successCount++;
            } else {
              throw new Error('El envío del correo falló');
            }
  
            // Pequeña pausa entre envíos para evitar sobrecarga
            await new Promise(resolve => setTimeout(resolve, 500));
  
          } catch (err) {
            const error = err as Error;
            console.error(`Error al procesar el envío para ${student.firstName} ${student.lastName}:`, error);
            errorCount++;
          }
        }
  
        // Mostrar solo el mensaje final
        if (successCount > 0) {
          if (errorCount > 0) {
            addToast(`Proceso completado: ${successCount} correos enviados correctamente, ${errorCount} fallidos`, 'info');
          } else {
            addToast(`Proceso completado: ${successCount} correos enviados correctamente`, 'success');
          }
        } else if (errorCount > 0) {
          addToast(`Error: Fallaron todos los envíos (${errorCount})`, 'error');
        }
      }
    } catch (err) {
      const error = err as Error;
      console.error('Error al enviar el correo:', error);
      addToast('Error al enviar el correo', 'error');
    } finally {
      setIsSending(false);
    }
  };

  const handleRecipientsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setRecipients(e.target.value);
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/30" />
        <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <Dialog.Title className="mb-4 text-lg font-medium text-gray-900">
            Enviar boletín por correo electrónico
          </Dialog.Title>

          <div className="mb-4">
            <label className="block mb-2 text-sm font-medium text-gray-700">
              Modo de envío
            </label>
            <div className="flex gap-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  className="text-indigo-600 form-radio"
                  name="sendMode"
                  value="individual"
                  checked={sendMode === 'individual'}
                  onChange={(e) => setSendMode(e.target.value as 'individual' | 'course')}
                />
                <span className="ml-2">Envío individual</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  className="text-indigo-600 form-radio"
                  name="sendMode"
                  value="course"
                  checked={sendMode === 'course'}
                  onChange={(e) => setSendMode(e.target.value as 'individual' | 'course')}
                />
                <span className="ml-2">Envío por curso</span>
              </label>
            </div>
          </div>
          
          <div className={`grid ${sendMode === 'individual' ? 'grid-cols-2' : 'grid-cols-1'} gap-6`}>
            <div className="space-y-4">
              {sendMode === 'course' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Curso
                  </label>
                  <div className="mt-1">
                    <CustomSelect
                      value={selectedCourse}
                      onChange={(value) => setSelectedCourse(value)}
                      options={courses.map(course => ({
                        id: course.id,
                        name: `${course.name}${course.levelName ? ` - ${course.levelName}` : ''}`
                      }))}
                      placeholder="Seleccionar curso"
                    />
                  </div>
                  {selectedCourse && (
                    <p className="mt-1 text-sm text-gray-500">
                      {`${students.filter(s => s.courseId === selectedCourse).length} alumnos en este curso`}
                    </p>
                  )}
                </div>
              )}

              {sendMode === 'individual' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Destinatarios
                  </label>
                  <div className="mt-1">
                    <textarea
                      value={recipients}
                      onChange={handleRecipientsChange}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      rows={2}
                      placeholder="ejemplo@correo.com, otro@correo.com"
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      {recipients ? 
                        `Correos detectados: ${recipients.split(',').length}` : 
                        'No se han detectado correos electrónicos para este alumno'
                      }
                    </p>
                  </div>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Plantilla
                </label>
                <div className="mt-1">
                  <CustomSelect
                    value={selectedTemplate}
                    onChange={(value) => {
                      setSelectedTemplate(value);
                      const template = templates.find(t => t.id === value);
                      if (template) {
                        setSubject(template.subject);
                        setBody(template.body);
                      }
                    }}
                    options={templates.map(template => ({
                      id: template.id,
                      name: template.name
                    }))}
                    placeholder="Seleccionar plantilla"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Asunto
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="block mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder="Asunto del correo"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Cuerpo del mensaje
                </label>
                <RichTextEditor
                  initialValue={body}
                  onChange={setBody}
                  placeholder="Escribe el contenido del correo..."
                  showToolbar={true}
                />
              </div>
            </div>

            {sendMode === 'individual' && (
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  Vista previa del PDF adjunto
                </label>
                <div className="overflow-hidden rounded-lg border border-gray-300" style={{ height: '600px' }}>
                  {pdfPreview ? (
                    <iframe
                      src={pdfPreview}
                      className="w-full h-full"
                      title="Vista previa del PDF"
                    />
                  ) : (
                    <div className="flex justify-center items-center h-full bg-gray-50">
                      <p className="text-gray-500">Cargando vista previa...</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          <div className="flex justify-end mt-6 space-x-3">
            <div className="flex-grow">
              {isSending && (
                <span className="text-sm text-gray-500">
                  Enviando correo, por favor espere...
                </span>
              )}
            </div>
            <div>
              <button
                type="button"
                className={`inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm ${
                  isSending ? 'opacity-75 cursor-not-allowed' : ''}`}
                onClick={handleSend}
                disabled={isSending || (sendMode === 'course' && !selectedCourse)}
              >
                {isSending ? 'Enviando...' : sendMode === 'course' ? 'Enviar a todo el curso' : 'Enviar'}
              </button>
              <button
                type="button"
                className="inline-flex justify-center px-4 py-2 text-base font-medium text-gray-700 bg-white rounded-md border border-gray-300 shadow-sm hover:bg-gray-50 focus:outline-none sm:mt-0 sm:w-auto sm:text-sm"
                onClick={onClose}
                disabled={isSending}
              >
                Cancelar
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

// Añadir la interfaz GradeSelectProps al inicio del archivo junto con las otras interfaces
interface GradeSelectProps {
  currentValue: string;
  onChange: (value: string) => void;
  evaluationCriteria: EvaluationCriterion[];
}

interface GradesPDFProps {
  student: Student;
  grades: Grades;
  courses: Course[];
  centerConfig: {
    name: string;
    logo?: string;
  };
  reportCard: ReportCardState;
  evaluationCriteria: EvaluationCriterion[];
}

interface HeaderProps {
  centerConfig: {
    name: string;
    logo?: string;
  };
  student: Student;
  courses: Course[];
  currentDate: string;
}

interface StudentInfoProps {
  student: Student;
  courses: Course[];
}

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#fff',
    padding: 40,
    fontFamily: 'Helvetica',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
    borderBottomWidth: 2,
    borderBottomColor: '#1e40af',
    paddingBottom: 20,
  },
  logoContainer: {
    width: 80,
    marginRight: 20,
  },
  headerContent: {
    flex: 1,
  },
  schoolName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 5,
  },
  academicInfo: {
    fontSize: 12,
    color: '#4b5563',
    marginBottom: 3,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 20,
    textTransform: 'uppercase',
  },
  studentInfoContainer: {
    backgroundColor: '#f3f4f6',
    padding: 15,
    marginBottom: 30,
    borderRadius: 5,
  },
  studentInfoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  label: {
    fontSize: 11,
    color: '#4b5563',
    width: '25%',
    fontWeight: 'bold',
  },
  value: {
    fontSize: 11,
    color: '#1f2937',
    flex: 1,
  },
  sectionContainer: {
    marginBottom: 20,
    break: 'page'
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 15,
    backgroundColor: '#e0e7ff',
    padding: 8,
    borderRadius: 4,
  },
  mainGradesContainer: {
    flexDirection: 'row',
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#f9fafb',
    borderRadius: 4,
    justifyContent: 'space-between',
    gap: 2,
  },
  gradeCard: {
    flex: 0.25,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gradeCardGlobal: {
    flex: 0.3,                 // Reducimos el flex para que ocupe menos espacio
    backgroundColor: '#f0f9ff',
    borderWidth: 2,
    borderColor: '#1e40af',
    borderRadius: 8,
    paddingHorizontal: 4,      // Ajusta horizontalmente para acercar texto y número
    paddingVertical: 6,        // Ajusta verticalmente
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gradeLabel: {
    fontSize: 11,
    color: '#4b5563',
    fontWeight: 'bold',
    marginRight: 8,
  },
  gradeLabelGlobal: {
    fontSize: 11,
    color: '#1e40af',
    fontWeight: 'bold',
    lineHeight: 1.2,
    marginRight: 2,            // Disminuye el margen para acercar texto
  },
  gradeValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1f2937',
    backgroundColor: '#f3f4f6',
    padding: 4,
    borderRadius: 4,
    minWidth: 60,
    textAlign: 'center',
  },
  gradeValueGlobal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e40af',
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 4,
    minWidth: 50,              // Ajusta ancho mínimo para no desbordar
    textAlign: 'center',
  },
  criteriaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  criteriaItem: {
    width: '48%',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 6,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  criteriaTitle: {
    fontSize: 11,
    color: '#4b5563',
    fontWeight: 'normal',
    flex: 1,
    marginRight: 10,
  },
  criteriaGrade: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1f2937',
    backgroundColor: '#f3f4f6',
    padding: 6,
    borderRadius: 4,
    textAlign: 'center',
    minWidth: 120,
  },
  observationsContainer: {
    marginTop: 10,
    padding: 15,
    backgroundColor: '#f3f4f6',
    borderRadius: 5,
  },
  observationsTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 8,
  },
  observationsText: {
    fontSize: 10,
    color: '#4b5563',
    lineHeight: 1.4,
  },
  bulletList: {
    marginLeft: 10,
  },
  bulletListItem: {
    marginBottom: 2,
  },
  orderedList: {
    marginLeft: 10,
    marginTop: 4,
  },
  orderedListItem: {
    marginBottom: 4,
    flexDirection: 'row',
  },
  listItemNumber: {
    marginRight: 5,
    width: 15,
  },
  listItemContent: {
    flex: 1,
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 20,
  },
  footerText: {
    fontSize: 8,
    color: '#9ca3af',
  },
  signatureSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 40,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  signatureBox: {
    width: '45%',
    alignItems: 'center',
  },
  signatureLine: {
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: '#9ca3af',
    marginBottom: 8,
  },
  signatureLabel: {
    fontSize: 10,
    color: '#4b5563',
    textAlign: 'center',
  },
  section: {
    marginBottom: 20,
  },
  field: {
    marginBottom: 10,
  },
  fieldName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1e40af',
  },
  fieldValue: {
    fontSize: 12,
    color: '#1f2937',
    flex: 1,
  },
});

// Texto enriquecido -> texto plano
const processRichText = (html: string | undefined): React.ReactNode => {
  if (!html) return null;

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  const processNode = (node: Node): React.ReactNode => {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent;
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      const children = Array.from(element.childNodes).map(processNode);

      switch (element.tagName.toLowerCase()) {
        case 'ul':
          return <View style={styles.bulletList}>{children}</View>;
        case 'ol':
          return (
            <View style={[styles.orderedList, { marginTop: 4 }]}>
              <Text>
                {Array.from(element.children).map((li, index) => (
                  index === 0 ? `\n${index + 1}. ${li.textContent}` : `${index + 1}. ${li.textContent}`
                )).join('\n')}
              </Text>
            </View>
          );
        case 'li':
          if (element.parentElement?.tagName.toLowerCase() === 'ul') {
            return <View style={styles.bulletListItem}>
              <Text>• {children}</Text>
            </View>;
          }
          return children;
        case 'p':
          return <Text>{children}</Text>;
        case 'strong':
          return <Text style={{ fontWeight: 'bold' }}>{children}</Text>;
        case 'em':
          return <Text style={{ fontStyle: 'italic' }}>{children}</Text>;
        case 'u':
          return <Text style={{ textDecoration: 'underline' }}>{children}</Text>;
        default:
          return children;
      }
    }

    return null;
  };

  return processNode(doc.body);
};

// Nota numérica a texto
const getGradeText = (grade: string | undefined): string => {
  if (!grade) return '';
  // Si es una nota numérica, la devolvemos tal cual
  if (!isNaN(Number(grade))) return grade;
  // Para las notas de texto, buscamos su equivalente numérico
  switch (grade.toUpperCase()) {
    case 'SOBRESALIENTE':
      return '9';
    case 'NOTABLE':
      return '7';
    case 'BIEN':
      return '6';
    case 'SUFICIENTE':
      return '5';
    case 'INSUFICIENTE':
      return '4';
    default:
      return grade;
  }
};

const Header = ({ centerConfig, student, courses, currentDate }: HeaderProps) => (
  <View style={styles.headerContainer}>
    {centerConfig?.logo && (
      <View style={styles.logoContainer}>
        <Image
          src={centerConfig.logo}
          style={{ width: 80, height: 80, objectFit: 'contain' }}
        />
      </View>
    )}
    <View style={styles.headerContent}>
      <Text style={styles.schoolName}>
        {(centerConfig?.name || ' ').trim()}
      </Text>
      <Text style={styles.academicInfo}>
        Curso Académico: {courses.find((c: Course) => c.id === student.courseId)?.academicYear || 'N/A'}
      </Text>
      <Text style={styles.academicInfo}>
        Fecha: {currentDate || 'N/A'}
      </Text>
    </View>
  </View>
);

const StudentInfo = ({ student, courses }: StudentInfoProps) => (
  <View style={styles.studentInfoContainer}>
    <View style={styles.studentInfoRow}>
      <Text style={styles.label}>Estudiante:</Text>
      <Text style={styles.value}>
        {student.lastName || student.firstName 
          ? `${student.lastName || ''}, ${student.firstName || ''}`
          : 'Nombre no disponible'}
      </Text>
    </View>
    <View style={styles.studentInfoRow}>
      <Text style={styles.label}>Curso:</Text>
      <Text style={styles.value}>
        {courses.find((c: Course) => c.id === student.courseId)?.name || 'N/A'}
      </Text>
    </View>
    <View style={styles.studentInfoRow}>
      <Text style={styles.label}>Instrumento:</Text>
      <Text style={styles.value}>
        {student.instrumentName?.trim() || 'No asignado'}
      </Text>
    </View>
  </View>
);

interface GradeSectionProps {
  section: {
    id: string;
    title: string;
    fields: Array<{ id: string; name: string }>;
  };
  grades: {
    [sectionId: string]: {
      attendance: string;
      global: string;
      criteria: { [fieldId: string]: string };
      observations?: string;
    };
  };
  evaluationCriteria: EvaluationCriterion[];
  courses: Course[];
  selectedStudent: Student | null;
}

const GradeSection = ({ section, grades, evaluationCriteria, courses, selectedStudent }: GradeSectionProps) => {
  const gradeData = grades[section.id];
  if (!gradeData) return null;

  const getCriteriaLabel = (value: string): string => {
    const criterion = evaluationCriteria.find((opt: EvaluationCriterion) => opt.value === value);
    return criterion?.label || '';
  };

  // Función para determinar el estilo de la nota global
  const getGlobalGradeStyle = (grade: string) => {
    const numericGrade = parseFloat(grade);
    if (isNaN(numericGrade)) return styles.gradeValueGlobal;

    return {
      ...styles.gradeValueGlobal,
      color: numericGrade < 5 ? '#dc2626' : '#1e40af' // rojo para < 5, azul para >= 5
    };
  };

  return (
    <View wrap={false} style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>{section.title || ' '}</Text>
      <View style={styles.mainGradesContainer}>
        <View style={styles.gradeCard}>
          <Text style={styles.gradeLabel}>CURSO:</Text>
          <Text style={styles.gradeValue}>
            {courses.find((c: Course) => c.id === selectedStudent?.courseId)?.name || ''}
          </Text>
        </View>
        <View style={styles.gradeCard}>
          <Text style={styles.gradeLabel}>FALTAS:</Text>
          <Text style={styles.gradeValue}>
            {gradeData.attendance || '0'}
          </Text>
        </View>
        <View style={styles.gradeCardGlobal}>
          <View style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
            <Text style={styles.gradeLabelGlobal}>CALIFICACIÓN</Text>
            <Text style={styles.gradeLabelGlobal}>GLOBAL</Text>
          </View>
          <Text style={getGlobalGradeStyle(gradeData.global)}>
            {getGradeText(gradeData.global)}
          </Text>
        </View>
      </View>
      <View style={styles.criteriaGrid}>
        {Object.entries(gradeData.criteria || {}).map(([criteriaId, grade]) => {
          const field = section.fields.find((f) => f.id === criteriaId);
          const fieldName = field?.name || '';
          if (!fieldName) return null;
          
          return (
            <View key={criteriaId} style={styles.criteriaItem}>
              <Text style={styles.criteriaTitle}>{fieldName}</Text>
              <Text style={styles.criteriaGrade}>
                {getCriteriaLabel(grade)}
              </Text>
            </View>
          );
        })}
      </View>
      {gradeData.observations?.trim() && (
        <View style={styles.observationsContainer}>
          <Text style={styles.observationsTitle}>Observaciones</Text>
          <Text style={styles.observationsText}>
            {processRichText(gradeData.observations)}
          </Text>
        </View>
      )}
    </View>
  );
};

const GradesPDF = ({
  student,
  grades,
  courses,
  centerConfig,
  reportCard,
  evaluationCriteria,
}: GradesPDFProps) => {
  const currentDate = new Date().toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Header
          centerConfig={centerConfig}
          student={student}
          courses={courses}
          currentDate={currentDate}
        />

        <StudentInfo student={student} courses={courses} />

        {reportCard.sections
          .filter(
            (section: Section) =>
              section.type !== 'header' &&
              !section.title.toLowerCase().trim().includes('encabezado')
          )
          .map((section: Section) => (
            <View wrap={false} key={section.id}>
              <GradeSection 
                key={section.id} 
                section={section} 
                grades={grades}
                evaluationCriteria={evaluationCriteria}
                courses={courses}
                selectedStudent={student}
              />
            </View>
          ))}

        <View style={styles.signatureSection}>
          <View style={styles.signatureBox}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>
              Firma del Profesor/a
            </Text>
          </View>
          <View style={styles.signatureBox}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>
              Firma del Director/a
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {centerConfig?.name || 'Escuela de Música'}
          </Text>
          <Text style={styles.footerText}>Página 1 de 1</Text>
        </View>
      </Page>
    </Document>
  );
};

// Añadir el componente Toast personalizado
interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
}

const Toast = ({ message, type, onClose }: ToastProps) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const getBackgroundColor = () => {
    switch (type) {
      case 'success': return 'bg-green-50 border-green-200';
      case 'error': return 'bg-red-50 border-red-200';
      case 'info': return 'bg-blue-50 border-blue-200';
    }
  };

  const getTextColor = () => {
    switch (type) {
      case 'success': return 'text-green-800';
      case 'error': return 'text-red-800';
      case 'info': return 'text-blue-800';
    }
  };

  return (
    <div className={`flex fixed top-4 right-4 z-50 items-center p-4 rounded-lg border shadow-lg ${getBackgroundColor()} animate-slide-in`}>
      <p className={`mr-3 text-sm font-medium ${getTextColor()}`}>{message}</p>
      <button
        onClick={onClose}
        className={`p-1 rounded-full hover:bg-white/20 ${getTextColor()}`}
        title="Cerrar notificación"
        aria-label="Cerrar notificación"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

// Añadir el estado para las notificaciones
interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

// Añadir el componente CustomSelect
const CustomSelect = ({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { id: string; name: string }[];
  placeholder: string;
}) => {
  return (
    <Listbox value={value} onChange={onChange}>
      {({ open }) => (
        <div className="relative">
          <Listbox.Button className="relative py-2 pr-10 pl-3 w-full text-left bg-white rounded-md border border-gray-300 cursor-default focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500">
            <span className="block truncate">
              {value ? options.find(opt => opt.id === value)?.name || placeholder : placeholder}
            </span>
            <span className="flex absolute inset-y-0 right-0 items-center pr-2 pointer-events-none">
              <ChevronsUpDown className="w-5 h-5 text-gray-400" aria-hidden="true" />
            </span>
          </Listbox.Button>

          <Transition
            show={open}
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Listbox.Options className="overflow-auto absolute z-10 py-1 mt-1 w-full max-h-60 text-base bg-white rounded-md ring-1 ring-black ring-opacity-5 shadow-lg focus:outline-none sm:text-sm">
              {options.map((option) => (
                <Listbox.Option
                  key={option.id}
                  className={({ active }) =>
                    `relative cursor-default select-none py-2 pl-10 pr-4 ${
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
};

export function GradesInput() {
  const { user } = useAuth();
  const isTeacher = user?.role === 'teacher';
  const teacherId = user?.teacherId;
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [reportCard, setReportCard] = useState<ReportCardState | null>(null);
  const [grades, setGrades] = useState<Grades>({});
  const [centerConfig, setCenterConfig] = useState<{name: string; logo?: string} | null>(null);
  const [expandedLevels, setExpandedLevels] = useState<{ [key: string]: boolean }>({});
  const [expandedCourses, setExpandedCourses] = useState<{ [key: string]: boolean }>({});
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
  const isAdmin = useAuth(state => state.user?.role === 'admin');
  const [] = useState<SignatureData>({});
  const [] = useState(false);
  const [] = useState<'draw' | 'upload'>('draw');
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Función para añadir una notificación
  const addToast = (message: string, type: 'success' | 'error' | 'info') => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  // Función para eliminar una notificación
  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

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
        setLoading(true);

        const [coursesData, criteriaData] = await Promise.all([
          getCourses(),
          getEvaluationCriteria()
        ]);

        setCourses(coursesData);
        setEvaluationCriteria(criteriaData);

        if (isTeacher && teacherId) {
          const teacherSubjects = await getTeacherSubjects(teacherId);
          const teacherCourseIds = teacherSubjects.map(ts => ts.courseId);

          if (teacherCourseIds.length > 0) {
            const studentsData = await getStudents();
            const filteredStudents = studentsData.filter(student =>
              teacherCourseIds.includes(student.courseId)
            );
            setStudents(filteredStudents);
          } else {
            setStudents([]);
          }
        } else {
          const studentsData = await getStudents();
          setStudents(studentsData);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isTeacher, teacherId]);

  useEffect(() => {
    if (selectedStudent) {
      console.log('Estudiante seleccionado (con instrumentName):', selectedStudent);
    }
  }, [selectedStudent]);

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
              const sectionIndex = updatedReportCard.sections.findIndex((s: Section) => s.id === criterion.sectionId);
              if (sectionIndex !== -1) {
                // Filtrar los campos existentes para no duplicar criterios
                const existingFieldIds = new Set(updatedReportCard.sections[sectionIndex].fields.map((f: Field) => f.id));
                
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
            data.sections.forEach((section: Section) => {
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
      const additionalCriteria = reportCard.sections.map((section: Section) => ({
        sectionId: section.id,
        fields: section.fields
          .filter((field: Field) => field.isAdditional)
          .map((field: Field) => ({
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
      const sectionIndex = updatedReportCard.sections.findIndex((s: Section) => s.id === sectionId);
      
      if (sectionIndex !== -1) {
        // Eliminar el campo de la lista de campos
        updatedReportCard.sections[sectionIndex].fields = 
          updatedReportCard.sections[sectionIndex].fields.filter((f: Field) => f.id !== fieldId);
        
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

  // Modificar la función handleAddCriterion para guardar automáticamente
  const handleAddCriterion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !reportCard) return;

    try {
      // Generar un ID único para el nuevo criterio
      const newFieldId = crypto.randomUUID();

      // Obtener el criterio por defecto
      const defaultCriterion = evaluationCriteria.find(c => c.isDefault);
      if (!defaultCriterion) {
        console.error('No se encontró un criterio por defecto');
        return;
      }

      // Crear el nuevo campo
      const newField: Field = {
        id: newFieldId,
        name: newCriterionName,
        type: 'select',
        isAdditional: true
      };

      // Actualizar el estado local
      const updatedReportCard = { ...reportCard };
      const sectionIndex = updatedReportCard.sections.findIndex(s => s.id === addingSectionId);
      
      if (sectionIndex !== -1) {
        updatedReportCard.sections[sectionIndex].fields.push(newField);
        setReportCard(updatedReportCard);

        // Actualizar las calificaciones locales con el valor por defecto
        const updatedGrades = {
          ...localGrades,
          [addingSectionId as string]: {
            ...(localGrades[addingSectionId as string] || {
              attendance: '',
              global: '',
              criteria: {},
              observations: ''
            }),
            attendance: localGrades[addingSectionId as string]?.attendance || '',
            global: localGrades[addingSectionId as string]?.global || '',
            criteria: {
              ...(localGrades[addingSectionId as string]?.criteria || {}),
              [newFieldId]: defaultCriterion.value // Asignar el valor por defecto
            },
            observations: localGrades[addingSectionId as string]?.observations || ''
          }
        };

        // Guardar inmediatamente en Turso
        await saveStudentGrades({
          studentId: selectedStudent.id,
          courseId: selectedStudent.courseId,
          templateId: reportCard.id,
          grades: updatedGrades,
          academicYear: '2023-2024',
          additionalCriteria: [
            ...reportCard.sections.map(section => ({
              sectionId: section.id,
              fields: section.fields.filter(f => f.isAdditional)
            }))
          ]
        });

        // Actualizar estados locales después del guardado exitoso
        setLocalGrades(updatedGrades);
        setGrades(updatedGrades);
        setSaveStatus('saved');
        setNewCriterionName('');
        setIsAddingCriterion(false);
        setAddingSectionId(null);
      }
    } catch (error) {
      console.error('Error al añadir y guardar criterio:', error);
      // Mostrar algún mensaje de error al usuario
    }
  };

  // Modificar el case 'header' en renderSection
  const renderSection = (section: Section) => {
    switch (section.type) {
      case 'header':
        // Logs fuera del JSX
        console.log("Antes del render - label:", selectedStudent?.instrumentName);
        console.log("Antes del render - span:", selectedStudent?.instrumentName);
        
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
                        <span className="font-medium text-gray-800">
                          {selectedStudent?.instrumentName || 'No asignado'}
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
                  {section.title === 'Instrumento' 
                    ? selectedStudent?.instrumentName || 'Instrumento'
                    : section.title}
                </h2>
              </div>

              {/* Contenido de la asignatura */}
              <div className="p-6 space-y-4">
                {/* Línea principal con curso, faltas y calificación */}
                <div className="grid grid-cols-12 gap-4 items-center p-4 bg-gray-50 rounded-lg">
                  {/* Curso */}
                  <div className="col-span-4">
                    <div className="flex items-center">
                      <span className="mr-2 text-sm font-medium text-gray-700">CURSO</span>
                      <div className="flex-1 px-3 py-2 bg-white rounded-md border">
                        <span className="text-gray-800">
                          {courses.find(c => c.id === selectedStudent?.courseId)?.name || ''}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Faltas de asistencia */}
                  <div className="col-span-3">
                    <div className="flex items-center">
                      <span className="mr-2 text-sm font-medium text-gray-700">FALTAS</span>
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
                  <div className="col-span-5">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-indigo-700 whitespace-nowrap">CALIFICACIÓN GLOBAL</span>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        step="0.01"
                        value={localGrades[section.id]?.global || ''}
                        onChange={(e) => handleGradeChange(section.id, 'global', '', e.target.value)}
                        className={`
                          px-3 py-2 w-20 ml-2 text-center rounded-md border-2 border-indigo-200 focus:ring-2 focus:ring-indigo-500 
                          [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none
                          ${parseFloat(localGrades[section.id]?.global || '0') >= 5 ? 'text-gray-900 bg-blue-50' : 'text-red-600'}
                          ${!localGrades[section.id]?.global && 'text-gray-900'}
                        `}
                        placeholder="--"
                      />
                    </div>
                  </div>
                </div>

                {/* Criterios de evaluación */}
                <div className="mb-6">
                  <h4 className="pb-2 mb-4 text-base font-semibold text-gray-800 border-b">
                    Criterios de evaluación
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    {section.fields
                      .filter((field: Field) => field.type === 'select')
                      .map((field: Field) => (
                        <div key={field.id} className="relative flex-1">
                          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <div className="flex flex-shrink items-center mr-4 min-w-0">
                              <span className="block text-sm font-medium text-gray-700 whitespace-normal break-words">
                                {field.name}
                              </span>
                            </div>
                            <div className="flex flex-shrink-0 gap-2 items-center">
                              <GradeSelect
                                currentValue={localGrades[section.id]?.criteria[field.id] || ''}
                                onChange={(value) => handleGradeChange(section.id, 'criteria', field.id, value)}
                                evaluationCriteria={evaluationCriteria}
                              />
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
                        </div>
                    ))}
                  </div>
                </div>

                {/* Campo de observaciones */}
                {section.fields.filter((field: Field) => field.type === 'text').map((field: Field) => (
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
                    <form onSubmit={handleAddCriterion} className="space-y-4">
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
            <h4 className="pb-2 mb-4 text-base font-semibold text-gray-800 border-b">
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

      case 'signatures':
        return (
          <div className="p-6 mb-6 bg-white rounded-lg border border-gray-100 shadow-md">
            <h4 className="pb-2 mb-4 text-base font-semibold text-gray-800 border-b">
              {section.title || 'Firmas'}
            </h4>
            <div className="grid grid-cols-2 gap-8">
              <div className="flex flex-col items-center">
                <div className="w-48 h-24 border-b-2 border-gray-300"></div>
                <p className="mt-2 text-sm text-gray-600">Firma del Profesor/a</p>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-48 h-24 border-b-2 border-gray-300"></div>
                <p className="mt-2 text-sm text-gray-600">Firma del Director/a</p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Modificar el componente GradeSelect
  const GradeSelect = ({ currentValue, onChange, evaluationCriteria }: GradeSelectProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const defaultCriterion = evaluationCriteria.find(c => c.isDefault);
    const effectiveValue = currentValue || (defaultCriterion?.value || '');
    
    return (
      <Listbox 
        value={effectiveValue} 
        onChange={(newValue) => {
          onChange(newValue);
        }}
      >
        {() => (
          <div ref={containerRef} className="relative min-w-[200px]">
            <Listbox.Button className="relative py-2 pr-10 pl-3 w-full text-left bg-gray-50 rounded-md border border-gray-300 shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500">
              <span className="block whitespace-pre-line">
                {evaluationCriteria.find(opt => opt.value === effectiveValue)?.label || "--"}
              </span>
              <span className="flex absolute inset-y-0 right-0 items-center pr-2 pointer-events-none">
                <ChevronsUpDown className="w-5 h-5 text-gray-400" />
              </span>
            </Listbox.Button>

            <Portal>
              <Transition
                as={Fragment}
                leave="transition ease-in duration-100"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <Listbox.Options 
                  className="overflow-auto fixed z-[100] py-1 mt-1 w-[200px] max-h-60 text-base bg-white rounded-md ring-1 ring-black ring-opacity-5 shadow-lg focus:outline-none sm:text-sm"
                  style={{
                    left: containerRef.current?.getBoundingClientRect().left + 'px',
                    top: (containerRef.current?.getBoundingClientRect().bottom || 0) + 4 + 'px'
                  }}
                >
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
                          <span className={`
                            block whitespace-pre-line 
                            ${selected ? 'font-medium' : 'font-normal'} 
                            ${criterion.isDefault ? 'italic' : ''}
                          `}>
                            {criterion.label}
                            {criterion.isDefault && ' (Por defecto)'}
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
            </Portal>
          </div>
        )}
      </Listbox>
    );
  };

  // Modificar la función handleDownloadPDF para manejar correctamente los valores nulos
  const handleDownloadPDF = async (targetStudent?: Student): Promise<string> => {
    try {
      const studentToUse = targetStudent || selectedStudent;
      if (!studentToUse || !reportCard) return '';
  
      // Obtener las calificaciones específicas del estudiante
      let studentGrades;
      try {
        const gradesData = await getStudentGrades(studentToUse.id, studentToUse.courseId);
        studentGrades = gradesData?.grades || {};
      } catch (error) {
        console.error(`Error al obtener calificaciones para ${studentToUse.firstName}:`, error);
        studentGrades = {};
      }
  
      const element = (
        <GradesPDF
          student={studentToUse}
          grades={studentGrades}
          courses={courses}
          centerConfig={centerConfig || { name: 'Centro de Música' }}
          reportCard={reportCard}
          evaluationCriteria={evaluationCriteria}
        />
      );
  
      const blob = await pdf(element).toBlob();
      const arrayBuffer = await blob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      let binaryString = '';
      uint8Array.forEach((byte) => {
        binaryString += String.fromCharCode(byte);
      });
      const base64String = btoa(binaryString);
  
      // Verificación del PDF
      if (!base64String.startsWith('JVBERi0')) {
        console.error('PDF inválido generado para:', studentToUse.firstName);
        throw new Error('El PDF generado no es válido');
      }
  
      // Log para debugging
      console.log(`PDF generado correctamente para ${studentToUse.firstName} ${studentToUse.lastName}`);
      console.log('PDF length:', base64String.length);
      console.log('PDF header:', base64String.substring(0, 20));
  
      return base64String;
    } catch (error) {
      console.error('Error al generar el PDF:', error);
      toast.error(`Error al generar el PDF para ${targetStudent?.firstName || 'el estudiante'}`);
      return '';
    }
  };

  // Crear una función separada para guardar el PDF en disco
  const savePDFToDisk = async () => {
    try {
      if (!selectedStudent || !reportCard) {
        toast.error('No hay datos suficientes para generar el PDF');
        return;
      }

      // Crear el contenido del PDF usando react-pdf-renderer
      const element = (
        <GradesPDF
          student={selectedStudent}
          grades={grades}
          courses={courses}
          centerConfig={centerConfig || { name: 'Centro de Música' }}
          reportCard={reportCard}
          evaluationCriteria={evaluationCriteria}
        />
      );

      // Renderizar a PDF y obtener como blob
      const blob = await pdf(element).toBlob();
      
      // Crear URL temporal
      const url = URL.createObjectURL(blob);
      
      // Crear enlace y simular clic
      const link = document.createElement('a');
      link.href = url;
      link.download = `boletin_${selectedStudent.firstName}_${selectedStudent.lastName}.pdf`;
      document.body.appendChild(link);
      link.click();
      
      // Limpiar
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('PDF guardado correctamente');
    } catch (error) {
      console.error('Error al guardar el PDF:', error);
      toast.error('Error al guardar el PDF');
    }
  };

  // Añadir funciones para manejar la expansión
  const toggleLevel = (levelId: string) => {
    setExpandedLevels(prev => ({
      ...prev,
      [levelId]: !prev[levelId]
    }));
  };

  const toggleCourse = (courseId: string) => {
    setExpandedCourses(prev => ({
      ...prev,
      [courseId]: !prev[courseId]
    }));
  };

  // Añadir esta interfaz después de las interfaces existentes y antes de los componentes
  // Esta interfaz es necesaria para mantener la consistencia en la estructura de datos
  // de las calificaciones de los estudiantes y posibles usos futuros en la aplicación
  // @ts-expect-error - Esta interfaz es necesaria para la estructura del proyecto
  interface StudentGradeData {
    attendance: string;
    global: string;
    criteria: { [key: string]: string };
    observations?: string;
  }

  // Eliminar completamente la declaración global y usar directamente window.electron con @ts-ignore

  const handleSendEmail = async (
    recipients: string[], 
    subject: string, 
    body: string,
    attachments?: { filename: string; content: string; contentType: string }[]
  ): Promise<boolean> => {
    try {
      // Verificar si estamos en Electron
      // @ts-ignore - window.electron está definido en el entorno Electron
      const isElectron = typeof window !== 'undefined' && !!window.electron;
      
      if (isElectron) {
        console.log('Enviando correo a través de IPC en Electron');
        // @ts-ignore - window.electron está definido en el entorno Electron
        const result = await window.electron.sendEmail({
          to: recipients,
          subject,
          html: body,
          attachments: attachments || []
        });
        
        if (result.success) {
          addToast('Correo enviado correctamente', 'success');
          return true;
        } else {
          addToast(`Error al enviar el correo: ${result.error}`, 'error');
          return false;
        }
      } else {
        console.log('Enviando correo a través del servidor Express');
        // Obtener la URL de la API desde las variables de entorno expuestas
        // @ts-ignore - window.env está definido en el entorno Electron
        const apiUrl = window.env?.VITE_API_URL || 'http://localhost:3001';
        console.log(`Usando API URL: ${apiUrl}`);
        
        const response = await fetch(`${apiUrl}/api/send-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: recipients,
            subject,
            html: body,
            attachments: attachments || []
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          addToast(`Error al enviar el correo: ${errorData.error || 'Error desconocido'}`, 'error');
          return false;
        }
        
        addToast('Correo enviado correctamente', 'success');
        return true;
      }
    } catch (error) {
      console.error('Error al enviar el correo:', error);
      addToast(`Error al enviar el correo: ${error instanceof Error ? error.message : 'Error desconocido'}`, 'error');
      return false;
    }
  };

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
      {/* Notificaciones */}
      <div className="fixed top-0 right-0 z-50 p-4 space-y-4">
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>

      {/* Barra superior */}
      <div className="flex justify-between items-center p-4 bg-white border-b">
        <h1 className="text-xl font-bold">Boletín de Notas</h1>
        {isAdmin && selectedStudent && reportCard && grades && (
          <div className="flex gap-4 justify-end">
            <button
              onClick={savePDFToDisk}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md border border-transparent shadow-sm transition-colors duration-200 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              title="Descargar boletín en PDF"
            >
              <Download className="mr-2 w-5 h-5" />
              Descargar PDF
            </button>
            <button
              onClick={() => setIsEmailModalOpen(true)}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md border border-transparent shadow-sm transition-colors duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              title="Enviar boletín por correo electrónico"
            >
              <Mail className="mr-2 w-5 h-5" />
              Enviar por Email
            </button>
          </div>
        )}
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
                  {/* Cabecera del nivel (acordeón) */}
                  <button
                    onClick={() => toggleLevel(levelId)}
                    className="flex justify-between items-center px-3 py-2 w-full text-left bg-gray-50 rounded-lg transition-colors hover:bg-gray-100"
                  >
                    <h3 className="font-medium text-gray-700">{level.levelName}</h3>
                    <svg
                      className={`w-5 h-5 text-gray-500 transition-transform ${
                        expandedLevels[levelId] ? 'transform rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Contenido del nivel */}
                  {expandedLevels[levelId] && (
                    <div className="mt-2 ml-2 space-y-2">
                      {Object.entries(level.courses).map(([courseId, course]) => (
                        <div key={courseId} className="rounded-lg border border-gray-100">
                          {/* Cabecera del curso (acordeón) */}
                          <button
                            onClick={() => toggleCourse(courseId)}
                            className="flex justify-between items-center px-3 py-2 w-full text-left rounded-lg transition-colors hover:bg-gray-50"
                          >
                            <h4 className="text-sm font-medium text-gray-600">{course.courseName}</h4>
                            <svg
                              className={`w-4 h-4 text-gray-400 transition-transform ${
                                expandedCourses[courseId] ? 'transform rotate-180' : ''}`}
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>

                          {/* Lista de estudiantes */}
                          {expandedCourses[courseId] && (
                            <ul className="px-2 py-1 space-y-1">
                              {course.students.map(student => (
                                <li key={student.id}>
                                  <button
                                    onClick={() => handleStudentSelect(student)}
                                    className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                                      selectedStudent?.id === student.id
                                        ? 'bg-indigo-100 text-indigo-700 font-medium'
                                        : 'hover:bg-gray-50 text-gray-600'
                                    }`}
                                  >
                                    {student.lastName}, {student.firstName}
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
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
                        title="Estudiante anterior"
                      >
                        <ChevronLeft className="w-6 h-6" />
                      </button>
                      <button
                        onClick={() => navigateToStudent('next')}
                        disabled={!selectedStudent}
                        className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-50"
                        title="Siguiente estudiante"
                      >
                        <ChevronRight className="w-6 h-6" />
                      </button>
                    </div>
                  </div>

                  {/* Renderizar las secciones del boletín */}
                  <div className="space-y-6">
                    {reportCard.sections.map((section: Section) => (
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

      {/* Añadir el modal de correo electrónico */}
      <EmailModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        courses={courses}
        selectedStudent={selectedStudent}
        onSend={handleSendEmail}
        handleDownloadPDF={handleDownloadPDF}
        students={students}
        grades={grades}
        addToast={addToast}
      />
    </div>
  );
} 
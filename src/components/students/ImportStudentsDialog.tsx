import { useState, useRef, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { Upload, AlertCircle, Download } from 'lucide-react';
import { Course, Instrument } from '../../types';
import * as XLSX from 'xlsx';
import { ImportStudentsPreview, StudentToImport } from './ImportStudentsPreview';

interface ImportStudentsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (students: StudentToImport[]) => void;
  courses: Course[];
  instruments: Instrument[];
}

export function ImportStudentsDialog({
  isOpen,
  onClose,
  onSave,
  courses,
  instruments,
}: ImportStudentsDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<StudentToImport[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      processExcelFile(selectedFile);
    }
  };

  const processExcelFile = async (file: File) => {
    setIsProcessing(true);
    setErrors([]);
    setPreview([]); // Limpiar la vista previa anterior
    
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      // Verificar que hay datos
      if (jsonData.length <= 1) {
        setErrors(['El archivo no contiene datos o solo contiene encabezados']);
        setIsProcessing(false);
        return;
      }
      
      // Obtener encabezados
      const headers = jsonData[0] as string[];
      
      // Verificar encabezados requeridos
      const requiredHeaders = ['firstName', 'lastName', 'identifier', 'courseName', 'instrumentName'];
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
      
      if (missingHeaders.length > 0) {
        setErrors([`Faltan encabezados requeridos: ${missingHeaders.join(', ')}`]);
        setIsProcessing(false);
        return;
      }

      const localErrors: string[] = [];
      const processedData: StudentToImport[] = [];
      
      // Procesar filas
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i] as any[];
        if (!row.length || row.every(cell => cell === undefined || cell === null || cell === '')) {
          // Saltar filas vacías
          continue;
        }
        
        const rowData: any = {};
        
        // Mapear datos según encabezados
        headers.forEach((header, colIndex) => {
          if (colIndex < row.length) {
            rowData[header] = row[colIndex];
          }
        });
        
        // Validar campos requeridos
        const rowErrors = requiredHeaders
          .filter(header => !rowData[header])
          .map(header => `Fila ${i + 1}: Falta el campo obligatorio "${header}"`);
        
        // Convertir nombre de curso a ID
        if (rowData.courseName) {
          const course = courses.find(c => 
            c.name.toLowerCase() === rowData.courseName.toLowerCase()
          );
          
          if (course) {
            rowData.courseId = course.id;
            rowData.levelId = course.levelId;
            // Mantener también el nombre del curso y nivel para la vista previa
            rowData.courseName = course.name;
            rowData.levelName = course.levelName;
          } else {
            rowErrors.push(`Fila ${i + 1}: No se encontró el curso "${rowData.courseName}"`);
          }
        }
        
        // Convertir nombre de instrumento a ID
        if (rowData.instrumentName) {
          const instrument = instruments.find(i => 
            i.name.toLowerCase() === rowData.instrumentName.toLowerCase()
          );
          
          if (instrument) {
            rowData.instrumentId = instrument.id;
            // Mantener también el nombre del instrumento para la vista previa
            rowData.instrumentName = instrument.name;
          } else {
            rowErrors.push(`Fila ${i + 1}: No se encontró el instrumento "${rowData.instrumentName}"`);
          }
        }

        if (rowErrors.length === 0) {
          processedData.push(rowData);
        }
        localErrors.push(...rowErrors);
      }
      
      setErrors(localErrors);
      setPreview(processedData);
      
      // Si hay datos procesados y no hay errores, mostrar la vista previa
      if (processedData.length > 0) {
        console.log('Datos procesados:', processedData);
      }
    } catch (error) {
      console.error('Error procesando archivo Excel:', error);
      setErrors(['Error al procesar el archivo. Asegúrate de que es un archivo Excel válido.']);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      setFile(droppedFile);
      processExcelFile(droppedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Intentando mostrar vista previa con", preview.length, "alumnos");
    if (preview.length > 0) {
      setShowPreview(true);
      console.log("Vista previa activada (se actualizará en el próximo render)");
    }
  };

  // Añade un useEffect para monitorear cambios en showPreview
  useEffect(() => {
    console.log("Estado de showPreview actualizado:", showPreview);
    if (showPreview) {
      console.log("Preview de estudiantes:", preview);
    }
  }, [showPreview, preview]);

  const handlePreviewConfirm = (confirmedStudents: StudentToImport[]) => {
    onSave(confirmedStudents);
    setShowPreview(false);
    onClose();
  };

  // Función para descargar la plantilla
  const downloadTemplate = () => {
    // Obtener los campos exactos del formulario de añadir alumnos
    const data = [
      ['firstName', 'lastName', 'identifier', 'courseName', 'levelName', 'instrumentName', 'email', 'phone', 'address'],
      ['Juan', 'Pérez', '12345678A', courses[0]?.name || '', courses[0]?.levelName || '', instruments[0]?.name || '', 'juan@example.com', '600123456', 'Calle Ejemplo 1'],
      ['María', 'García', '87654321B', courses[0]?.name || '', courses[0]?.levelName || '', instruments[0]?.name || '', 'maria@example.com', '600654321', 'Calle Ejemplo 2']
    ];
    
    // Crear libro y hoja
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);
    
    // Añadir información sobre los cursos e instrumentos disponibles
    const courseSheet = XLSX.utils.aoa_to_sheet([
      ['Nombre del Curso (usar exactamente como aparece aquí)', 'Nivel'],
      ...courses.map(c => [c.name, c.levelName || ''])
    ]);
    
    const instrumentSheet = XLSX.utils.aoa_to_sheet([
      ['Nombre del Instrumento (usar exactamente como aparece aquí)'],
      ...instruments.map(i => [i.name])
    ]);
    
    // Añadir hojas al libro
    XLSX.utils.book_append_sheet(wb, ws, 'Alumnos');
    XLSX.utils.book_append_sheet(wb, courseSheet, 'Cursos Disponibles');
    XLSX.utils.book_append_sheet(wb, instrumentSheet, 'Instrumentos Disponibles');
    
    // Descargar archivo
    XLSX.writeFile(wb, 'plantilla_importacion_alumnos.xlsx');
  };

  return (
    <>
      <Dialog open={isOpen} onClose={onClose} className="overflow-y-auto fixed inset-0 z-10">
        <div className="flex justify-center items-center px-4 min-h-screen">
          <div className="fixed inset-0 bg-black opacity-30" />

          <div className="relative p-6 w-full max-w-3xl bg-white rounded-lg shadow-xl">
            <Dialog.Title className="text-lg font-medium text-gray-900">
              Importar Alumnos desde Excel
            </Dialog.Title>

            <form onSubmit={handleSubmit}>
              <div className="mt-4 space-y-6">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-500">
                    Sube un archivo Excel con los datos de los alumnos. El archivo debe tener encabezados en la primera fila.
                  </p>
                  
                  <button
                    type="button"
                    onClick={downloadTemplate}
                    className="flex items-center px-3 py-2 text-sm text-indigo-600 rounded-md border border-indigo-300 hover:bg-indigo-50"
                  >
                    <Download className="mr-2 w-4 h-4" />
                    Descargar plantilla
                  </button>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowOptions(!showOptions)}
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                  >
                    {showOptions ? 'Ocultar opciones disponibles' : 'Ver opciones disponibles'}
                  </button>
                </div>

                {showOptions && (
                  <div className="grid grid-cols-1 gap-4 p-4 bg-blue-50 rounded-md md:grid-cols-2">
                    <div>
                      <h4 className="mb-1 text-xs font-medium text-gray-600">Cursos (courseName)</h4>
                      <div className="overflow-y-auto p-2 max-h-40 bg-white rounded-md border border-gray-200">
                        <table className="min-w-full text-xs">
                          <thead>
                            <tr>
                              <th className="px-2 py-1 font-medium text-left text-gray-500">Nombre (usar exactamente)</th>
                              <th className="px-2 py-1 font-medium text-left text-gray-500">Nivel</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {courses.map(course => (
                              <tr key={course.id} className="hover:bg-gray-50">
                                <td className="px-2 py-1 font-medium">{course.name}</td>
                                <td className="px-2 py-1">{course.levelName}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="mb-1 text-xs font-medium text-gray-600">Instrumentos (instrumentName)</h4>
                      <div className="overflow-y-auto p-2 max-h-40 bg-white rounded-md border border-gray-200">
                        <table className="min-w-full text-xs">
                          <thead>
                            <tr>
                              <th className="px-2 py-1 font-medium text-left text-gray-500">Nombre (usar exactamente)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {instruments.map(instrument => (
                              <tr key={instrument.id} className="hover:bg-gray-50">
                                <td className="px-2 py-1">{instrument.name}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                <div
                  className="p-8 text-center rounded-lg border-2 border-gray-300 border-dashed cursor-pointer hover:bg-gray-50"
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".xlsx,.xls"
                    className="hidden"
                    aria-label="Seleccionar archivo Excel"
                    title="Seleccionar archivo Excel"
                  />
                  <Upload className="mx-auto w-12 h-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-600">
                    {file ? file.name : 'Arrastra un archivo Excel aquí o haz clic para seleccionar'}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Solo archivos Excel (.xlsx, .xls)
                  </p>
                </div>

                {isProcessing && (
                  <div className="py-4 text-center">
                    <div className="inline-block w-8 h-8 rounded-full border-t-2 border-b-2 border-indigo-600 animate-spin"></div>
                    <p className="mt-2 text-gray-600">Procesando archivo...</p>
                  </div>
                )}

                {errors.length > 0 && (
                  <div className="p-4 bg-red-50 rounded-md border border-red-200">
                    <div className="flex items-start">
                      <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 mr-2" />
                      <div>
                        <h3 className="text-sm font-medium text-red-800">
                          Se encontraron {errors.length} errores:
                        </h3>
                        <ul className="mt-2 text-sm list-disc list-inside text-red-700">
                          {errors.slice(0, 5).map((error, index) => (
                            <li key={index}>{error}</li>
                          ))}
                          {errors.length > 5 && (
                            <li>Y {errors.length - 5} más...</li>
                          )}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {preview.length > 0 && (
                  <div className="p-4 bg-green-50 rounded-md border border-green-200">
                    <p className="text-sm text-green-700">
                      Se han procesado {preview.length} alumnos correctamente. Haz clic en "Revisar" para ver los detalles.
                    </p>
                  </div>
                )}

                <div className="flex justify-end mt-6 space-x-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white rounded-md border border-gray-300 shadow-sm hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={preview.length === 0}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md border border-transparent shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Revisar {preview.length} alumnos
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </Dialog>

      {/* Componente de vista previa detallada */}
      <ImportStudentsPreview
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        onConfirm={handlePreviewConfirm}
        students={preview}
        courses={courses}
        instruments={instruments}
      />
    </>
  );
} 
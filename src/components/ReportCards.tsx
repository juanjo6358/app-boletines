import { BackButton } from './BackButton';
import { ReportCardDesigner } from './report-cards/ReportCardDesigner';
import { useIsAdmin, useHasPermission } from '../lib/auth';
import { Navigate } from 'react-router-dom';

export function ReportCards() {
  const isAdmin = useIsAdmin();
  const canViewReportCards = useHasPermission('view_report_cards');
  
  // Si el usuario no tiene permiso para ver boletines, redirigir al dashboard
  if (!isAdmin && !canViewReportCards) {
    return <Navigate to="/" replace />;
  }
  
  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <BackButton />
        </div>
        
        {/* Solo mostrar el diseñador de plantillas si el usuario es administrador */}
        {isAdmin ? (
          <ReportCardDesigner />
        ) : (
          <div className="text-center py-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Visualización de Boletines
            </h2>
            <p className="text-gray-600 mb-8">
              Como profesor, puedes ver los boletines de tus estudiantes pero no puedes modificar las plantillas.
            </p>
            <p className="text-gray-600">
              Para ver los boletines de tus estudiantes, ve a la sección "Introducción de Notas" y selecciona un estudiante.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
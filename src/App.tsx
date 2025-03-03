import React, { CSSProperties } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './lib/auth';
import { Music2Icon, LogOut } from 'lucide-react';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { Students } from './components/Students';
import { Courses } from './components/Courses';
import { ReportCards } from './components/ReportCards';
import { Settings } from './components/Settings';
import { Teachers } from './components/Teachers';
import { TeacherSubjects } from './components/TeacherSubjects';
import { GradesInput } from './components/grades/GradesInput';

// Definir el tipo para el estilo de WebkitAppRegion
const dragStyle: CSSProperties = {
  WebkitAppRegion: 'drag'
} as CSSProperties;

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuth((state) => state.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

function App() {
  const isAuthenticated = useAuth((state) => state.isAuthenticated);
  const logout = useAuth((state) => state.logout);

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        {isAuthenticated && (
          <nav className="fixed top-0 left-0 right-0 z-50">
            {/* Área para arrastrar la ventana (titlebar) */}
            <div className="h-7" style={dragStyle} />
            
            {/* Contenido del navbar */}
            <div className="bg-white/80 backdrop-blur-md border-b border-gray-200">
              <div className="px-4">
                <div className="flex justify-between h-12">
                  <div className="flex items-center -ml-3">
                    {/* Ajustado el padding-left para los botones de control */}
                    <div className="flex flex-shrink-0 items-center pl-20">
                      <Music2Icon className="w-6 h-6 text-indigo-600" />
                      <span className="ml-2 text-lg font-semibold text-gray-900">
                        Escuela de Música
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <button
                      onClick={() => logout()}
                      className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-900 rounded-md hover:bg-gray-100"
                    >
                      <LogOut className="mr-1.5 w-4 h-4" />
                      <span>Cerrar Sesión</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </nav>
        )}

        {/* Ajustar el contenido principal para el navbar */}
        <main className={`${isAuthenticated ? 'pt-20' : ''} p-4`}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/students"
              element={
                <PrivateRoute>
                  <Students />
                </PrivateRoute>
              }
            />
            <Route
              path="/courses"
              element={
                <PrivateRoute>
                  <Courses />
                </PrivateRoute>
              }
            />
            <Route
              path="/report-cards"
              element={
                <PrivateRoute>
                  <ReportCards />
                </PrivateRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <PrivateRoute>
                  <Settings />
                </PrivateRoute>
              }
            />
            <Route
              path="/teachers"
              element={
                <PrivateRoute>
                  <Teachers />
                </PrivateRoute>
              }
            />
            <Route
              path="/teacher-subjects"
              element={
                <PrivateRoute>
                  <TeacherSubjects />
                </PrivateRoute>
              }
            />
            <Route
              path="/grades"
              element={
                <PrivateRoute>
                  <GradesInput />
                </PrivateRoute>
              }
            />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
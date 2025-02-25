import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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
        <nav className="bg-white shadow-sm">
          <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex">
                <div className="flex flex-shrink-0 items-center">
                  <Music2Icon className="w-8 h-8 text-indigo-600" />
                  <span className="ml-2 text-xl font-semibold text-gray-900">
                    Escuela de Música
                  </span>
                </div>
              </div>
              {isAuthenticated && (
                <div className="flex items-center">
                  <button
                    onClick={() => logout()}
                    className="flex items-center text-gray-600 hover:text-gray-900"
                  >
                    <LogOut className="mr-1 w-5 h-5" />
                    <span>Cerrar Sesión</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </nav>

        <main className="py-6 mx-auto max-w-7xl sm:px-6 lg:px-8">
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
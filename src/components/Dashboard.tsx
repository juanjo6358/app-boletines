import { Link } from 'react-router-dom';
import { Users, GraduationCap, ClipboardList, Settings, School, BookOpen } from 'lucide-react';
import { useIsAdmin } from '../lib/auth';

export function Dashboard() {
  const isAdmin = useIsAdmin();

  const menuItems = [
    {
      name: 'Alumnos',
      href: '/students',
      icon: Users,
      gradient: 'from-blue-600 to-blue-400',
    },
    {
      name: 'Profesores',
      href: '/teachers',
      icon: GraduationCap,
      gradient: 'from-purple-600 to-purple-400',
    },
    {
      name: 'Cursos',
      href: '/courses',
      icon: BookOpen,
      gradient: 'from-emerald-600 to-emerald-400',
    },
    {
      name: 'Boletines',
      href: '/report-cards',
      icon: ClipboardList,
      gradient: 'from-amber-600 to-amber-400',
    },
    {
      name: 'Introducción de Notas',
      href: '/grades',
      icon: ClipboardList,
      gradient: 'from-teal-600 to-teal-400',
    },
    {
      name: 'Asignaturas del Profesorado',
      href: '/teacher-subjects',
      icon: BookOpen,
      gradient: 'from-pink-600 to-pink-400',
    },
    {
      name: 'Configuración',
      href: '/settings',
      icon: Settings,
      gradient: 'from-gray-600 to-gray-400',
      adminOnly: true,
    },
  ];

  const filteredItems = isAdmin ? menuItems : menuItems.filter(item => !item.adminOnly);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="py-8">
        <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8 text-center">
            <School className="mx-auto mb-4 w-16 h-16 text-indigo-600" />
            <h1 className="text-3xl font-bold text-gray-900">
              Panel de Control
            </h1>
            <p className="mt-2 text-lg text-gray-600">
              Bienvenido al sistema de gestión académica
            </p>
          </div>

          {/* Grid de menú */}
          <div className="grid auto-rows-fr gap-6 mt-8 sm:grid-cols-2 lg:grid-cols-3">
            {filteredItems.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className="overflow-hidden relative h-full group"
              >
                <div className="flex items-center h-full p-6 bg-white rounded-xl shadow-sm transition-all duration-300 hover:shadow-lg hover:scale-[1.02]">
                  <div className={`flex items-center justify-center p-4 rounded-lg bg-gradient-to-br ${item.gradient}`}>
                    <item.icon className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="ml-4 text-xl font-semibold text-gray-900">
                    {item.name}
                  </h2>

                  {/* Decorative elements */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent opacity-0 transition-opacity to-white/5 group-hover:opacity-100" />
                  <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-transparent to-transparent transition-all duration-300 group-hover:via-indigo-500" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
# Boletines de Notas

Aplicación de escritorio para la gestión de boletines de notas escolares, desarrollada con Electron, React y TypeScript.

## Características

- 👥 Gestión de alumnos y profesores
- 📚 Administración de cursos y asignaturas
- 📊 Introducción y gestión de calificaciones
- 📝 Generación de boletines de notas en PDF
- 📧 Envío automático de boletines por correo electrónico
- 🔐 Sistema de roles y permisos
- 🎨 Interfaz moderna y responsive con Tailwind CSS

## Requisitos Previos

- Node.js (v18 o superior)
- npm (v9 o superior)
- Una cuenta de Gmail (para el envío de correos)
- Una base de datos Turso

## Instalación

1. Clona el repositorio:
```bash
git clone https://github.com/tu-usuario/boletines-notas.git
cd boletines-notas
```

2. Instala las dependencias:
```bash
npm install
```

3. Copia el archivo de ejemplo de variables de entorno:
```bash
cp .env.example .env
```

4. Configura las variables de entorno en el archivo `.env`

## Configuración

### Base de Datos Turso

1. Crea una base de datos en [Turso](https://turso.tech)
2. Obtén la URL y el token de autenticación
3. Actualiza las variables `VITE_TURSO_DB_URL` y `VITE_TURSO_DB_AUTH_TOKEN` en tu archivo `.env`

### Configuración de Gmail

Tienes dos opciones para configurar el envío de correos:

#### Opción 1: Contraseña de Aplicación (Recomendado)

1. Activa la verificación en dos pasos en tu cuenta de Gmail
2. Ve a [Contraseñas de aplicación](https://myaccount.google.com/apppasswords)
3. Genera una nueva contraseña de aplicación
4. Actualiza `GMAIL_USER` y `GMAIL_APP_PASSWORD` en tu archivo `.env`

#### Opción 2: OAuth2

1. Crea un proyecto en [Google Cloud Console](https://console.cloud.google.com)
2. Configura las credenciales OAuth2
3. Obtén el ID de cliente, secreto de cliente y token de actualización
4. Actualiza las variables OAuth correspondientes en tu archivo `.env`

## Desarrollo

Para ejecutar la aplicación en modo desarrollo:

```bash
npm run dev
```

## Construcción

Para construir la aplicación:

```bash
npm run dist
```

Los archivos empaquetados se encontrarán en la carpeta `release`.

## Estructura de la Base de Datos

### Tablas Principales

\`\`\`sql
-- Tabla de Usuarios
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Estudiantes
CREATE TABLE students (
    id TEXT PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT UNIQUE,
    course_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id)
);

-- Tabla de Profesores
CREATE TABLE teachers (
    id TEXT PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Cursos
CREATE TABLE courses (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    academic_year TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Asignaturas
CREATE TABLE subjects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    course_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id)
);

-- Tabla de Asignaciones Profesor-Asignatura
CREATE TABLE teacher_subjects (
    id TEXT PRIMARY KEY,
    teacher_id TEXT NOT NULL,
    subject_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (teacher_id) REFERENCES teachers(id),
    FOREIGN KEY (subject_id) REFERENCES subjects(id)
);

-- Tabla de Calificaciones
CREATE TABLE grades (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    subject_id TEXT NOT NULL,
    term INTEGER NOT NULL,
    grade REAL NOT NULL,
    comments TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id),
    FOREIGN KEY (subject_id) REFERENCES subjects(id)
);

-- Tabla de Configuración de Correo
CREATE TABLE email_configs (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    auth_type TEXT NOT NULL,
    password TEXT,
    oauth_credentials TEXT,
    is_default BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
\`\`\`

## Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo [LICENSE](LICENSE) para más detalles.

## Contribuir

Las contribuciones son bienvenidas. Por favor, abre un issue primero para discutir los cambios que te gustaría hacer. 
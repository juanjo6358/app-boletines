-- Tablas que queremos preservar (mover estos CREATE TABLE al principio)
CREATE TABLE IF NOT EXISTS criteria_groups (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)))),
  name TEXT NOT NULL,
  criteria TEXT NOT NULL, -- JSON con los criterios
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de instrumentos
CREATE TABLE IF NOT EXISTS instruments (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)))),
    name TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de niveles
CREATE TABLE IF NOT EXISTS levels (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)))),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de cursos
CREATE TABLE IF NOT EXISTS courses (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)))),
    name TEXT NOT NULL,
    level_id TEXT NOT NULL,
    academic_year TEXT NOT NULL,
    template_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (level_id) REFERENCES levels(id) ON DELETE CASCADE,
    FOREIGN KEY (template_id) REFERENCES course_templates(id) ON DELETE SET NULL
);

-- Tabla de asignaturas grupales
CREATE TABLE IF NOT EXISTS group_subjects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de profesores
CREATE TABLE IF NOT EXISTS teachers (
  id TEXT PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  identifier TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  instrument_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (instrument_id) REFERENCES instruments(id)
) STRICT;

-- Tabla de relación entre profesores y asignaturas grupales
CREATE TABLE IF NOT EXISTS teacher_group_subjects (
  teacher_id TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  PRIMARY KEY (teacher_id, subject_id),
  FOREIGN KEY (teacher_id) REFERENCES teachers(id),
  FOREIGN KEY (subject_id) REFERENCES group_subjects(id)
);

-- Tabla de plantillas de curso
CREATE TABLE IF NOT EXISTS course_templates (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)))),
  name TEXT NOT NULL,
  level_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  academic_year TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (level_id) REFERENCES levels(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- Tabla de asignaturas en plantillas
CREATE TABLE IF NOT EXISTS course_template_subjects (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)))),
  template_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('individual', 'group')),
  is_required BOOLEAN NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (template_id) REFERENCES course_templates(id) ON DELETE CASCADE
);

-- Tabla intermedia para la relación many-to-many entre profesores y cursos
CREATE TABLE IF NOT EXISTS teacher_courses (
  teacher_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (teacher_id, course_id),
  FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
) STRICT;

-- Primero eliminar la tabla si existe
DROP TABLE IF EXISTS report_cards;

-- Crear la tabla con la estructura correcta
CREATE TABLE IF NOT EXISTS report_cards (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)))),
  course_id TEXT NOT NULL UNIQUE,
  sections TEXT NOT NULL,  -- JSON con las secciones
  subjects TEXT NOT NULL,  -- JSON con las asignaturas
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
) STRICT;

-- Asegurarnos de que las claves foráneas están activadas
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS student_grades (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  template_id TEXT NOT NULL,
  academic_year TEXT NOT NULL,
  grades TEXT NOT NULL,
  additional_criteria TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
); 
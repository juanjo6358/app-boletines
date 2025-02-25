// Función para crear el esquema de la base de datos
export async function createSchema(db: any) {
  // Crear tabla de usuarios si no existe
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password TEXT,
      role TEXT NOT NULL CHECK (role IN ('admin', 'teacher')),
      email TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      teacher_id TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL
    );
  `);

  // Crear índice para búsqueda rápida por username
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
  `);

  // Crear índice para la relación con teachers
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_users_teacher_id ON users(teacher_id);
  `);
  
  // Verificar si la columna permissions existe
  try {
    // Intentar añadir la columna permissions si no existe
    await db.execute(`
      ALTER TABLE users ADD COLUMN permissions TEXT;
    `);
    console.log('Columna permissions añadida a la tabla users');
  } catch (error) {
    // Si hay un error, probablemente la columna ya existe
    console.log('La columna permissions ya existe o hubo un error al añadirla:', error);
  }
} 
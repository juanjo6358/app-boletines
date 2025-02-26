// Función para crear el esquema de la base de datos
export async function createSchema(db: any) {
  try {
    // Primero verificar si la tabla users existe
    const tableExists = await db.execute(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='users';
    `);

    if (tableExists.rows.length === 0) {
      // Si la tabla no existe, crearla con todas las columnas
      await db.execute(`
        CREATE TABLE users (
          id TEXT PRIMARY KEY,
          username TEXT NOT NULL UNIQUE,
          password TEXT,
          role TEXT NOT NULL CHECK (role IN ('admin', 'teacher')),
          email TEXT NOT NULL,
          is_active INTEGER DEFAULT 1,
          teacher_id TEXT,
          permissions TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL
        );
      `);

      // Crear índices
      await db.execute(`
        CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      `);

      await db.execute(`
        CREATE INDEX IF NOT EXISTS idx_users_teacher_id ON users(teacher_id);
      `);
    } else {
      // Si la tabla existe, verificar si la columna permissions existe
      const columnsResult = await db.execute(`
        PRAGMA table_info(users);
      `);
      
      const hasPermissions = columnsResult.rows.some(
        (row: any) => row.name === 'permissions'
      );

      if (!hasPermissions) {
        // Solo añadir la columna si no existe
        await db.execute(`
          ALTER TABLE users ADD COLUMN permissions TEXT;
        `);
        console.log('Columna permissions añadida a la tabla users');
      }
    }
  } catch (error) {
    console.error('Error en createSchema:', error);
    throw error;
  }
} 
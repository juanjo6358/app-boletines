import { createClient } from '@libsql/client';
import { 
  Instrument, 
  Level, 
  Course, 
  AcademicYear, 
  Student, 
  GroupSubject, 
  Teacher, 
  CourseTemplate, 
  CourseTemplateSubject, 
  TeacherCourseSubject,
  ReportCardState,
  CriteriaGroup,
  Section,
  Field,
  EvaluationCriterion,
  User,
  Permission
} from '../../types';
import { OAuthCredentials, EmailConfig, EmailTemplate } from '../../types/email';
import { createSchema } from './schema';
import CryptoJS from 'crypto-js';

// Clave secreta para encriptación
const ENCRYPTION_KEY = import.meta.env.VITE_ENCRYPTION_KEY || 'tu_clave_secreta_muy_larga_y_compleja';

// Funciones de encriptación
const encryptPassword = (password: string): string => {
  return CryptoJS.AES.encrypt(password, ENCRYPTION_KEY).toString();
};

const decryptPassword = (encryptedPassword: string): string => {
  const bytes = CryptoJS.AES.decrypt(encryptedPassword, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
};

// Definir los tipos localmente
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

const url = import.meta.env.VITE_TURSO_DB_URL;
const authToken = import.meta.env.VITE_TURSO_DB_AUTH_TOKEN;

if (!url || !authToken) {
  throw new Error('Missing Turso database credentials');
}

export const db = createClient({
  url,
  authToken,
});

// Funciones para Instrumentos
export async function getInstruments(): Promise<Instrument[]> {
  const result = await db.execute('SELECT * FROM instruments ORDER BY name');
  return result.rows.map(row => ({
    id: row.id as string,
    name: row.name as string,
  }));
}

export async function createInstrument(name: string): Promise<Instrument> {
  const result = await db.execute({
    sql: 'INSERT INTO instruments (name) VALUES (?) RETURNING *',
    args: [name]
  });
  const row = result.rows[0];
  return {
    id: row.id as string,
    name: row.name as string,
  };
}

export async function updateInstrument(id: string, name: string): Promise<void> {
  await db.execute({
    sql: 'UPDATE instruments SET name = ? WHERE id = ?',
    args: [name, id]
  });
}

export async function deleteInstrument(id: string): Promise<void> {
  await db.execute({
    sql: 'DELETE FROM instruments WHERE id = ?',
    args: [id]
  });
}

// Funciones para Niveles
export async function getLevels(): Promise<Level[]> {
  const result = await db.execute('SELECT * FROM levels ORDER BY name');
  return result.rows.map(row => ({
    id: row.id as string,
    name: row.name as string,
  }));
}

export async function createLevel(name: string): Promise<Level> {
  const result = await db.execute({
    sql: 'INSERT INTO levels (name) VALUES (?) RETURNING *',
    args: [name]
  });
  const row = result.rows[0];
  return {
    id: row.id as string,
    name: row.name as string,
  };
}

export async function updateLevel(id: string, name: string): Promise<void> {
  await db.execute({
    sql: 'UPDATE levels SET name = ? WHERE id = ?',
    args: [name, id]
  });
}

export async function deleteLevel(id: string): Promise<void> {
  await db.execute({
    sql: 'DELETE FROM levels WHERE id = ?',
    args: [id]
  });
}

// Funciones para Cursos
export async function getCourses(): Promise<Course[]> {
  const result = await db.execute(`
    SELECT 
      c.id,
      c.name,
      c.level_id,
      c.template_id,
      c.academic_year_id,
      l.name as level_name,
      ay.name as academic_year_name,
      ct.id as template_id_verified,
      ct.academic_year as template_academic_year
    FROM courses c
    LEFT JOIN levels l ON c.level_id = l.id
    LEFT JOIN academic_years ay ON c.academic_year_id = ay.id
    LEFT JOIN course_templates ct ON c.template_id = ct.id
    ORDER BY l.name, c.name
  `);

  console.log('Raw courses data:', result.rows);

  const courses = result.rows.map(row => {
    const course = {
      id: row.id as string,
      name: row.name as string,
      levelId: row.level_id as string,
      levelName: row.level_name as string,
      academicYear: row.academic_year_name as string,
      templateId: row.template_id as string || undefined
    };

    console.log('Mapped course:', {
      ...course,
      rawTemplateId: row.template_id,
      verifiedTemplateId: row.template_id_verified,
      academicYearId: row.academic_year_id,
      academicYearName: row.academic_year_name,
      templateAcademicYear: row.template_academic_year
    });

    return course;
  });

  return courses;
}

export async function createCourse(
  name: string,
  levelId: string,
  academicYear: string,
  templateId: string | null
): Promise<Course> {
  const level = await db.execute({
    sql: 'SELECT name FROM levels WHERE id = ?',
    args: [levelId]
  });

  const result = await db.execute({
    sql: `
      INSERT INTO courses (name, level_id, academic_year_id, template_id)
      VALUES (?, ?, ?, ?)
      RETURNING id
    `,
    args: [name, levelId, academicYear, templateId]
  });

  if (!result.rows.length) {
    throw new Error('Error al crear el curso: no se pudo obtener el ID');
  }

  return {
    id: result.rows[0].id as string,
    name,
    levelId,
    levelName: level.rows[0].name as string,
    academicYear,
    templateId: templateId || undefined
  };
}

export async function updateCourse(
  id: string,
  name: string,
  levelId: string,
  academicYear: string,
  templateId: string | null
): Promise<Course> {
  const level = await db.execute({
    sql: 'SELECT name FROM levels WHERE id = ?',
    args: [levelId]
  });

  await db.execute({
    sql: `
      UPDATE courses
      SET name = ?, level_id = ?, academic_year_id = ?, template_id = ?
      WHERE id = ?
    `,
    args: [name, levelId, academicYear, templateId, id]
  });

  return {
    id,
    name,
    levelId,
    levelName: level.rows[0].name as string,
    academicYear,
    templateId: templateId || undefined
  };
}

export async function deleteCourse(id: string): Promise<void> {
  await db.execute({
    sql: 'DELETE FROM courses WHERE id = ?',
    args: [id]
  });
}

// Funciones para Años Académicos
export async function getAcademicYears(): Promise<AcademicYear[]> {
  const result = await db.execute('SELECT * FROM academic_years ORDER BY name');
  return result.rows.map(row => ({
    id: row.id as string,
    name: row.name as string,
    isActive: Boolean(row.is_active),
  }));
}

export async function createAcademicYear(name: string): Promise<AcademicYear> {
  const result = await db.execute({
    sql: 'INSERT INTO academic_years (name, is_active) VALUES (?, false) RETURNING *',
    args: [name]
  });
  const row = result.rows[0];
  return {
    id: row.id as string,
    name: row.name as string,
    isActive: Boolean(row.is_active),
  };
}

export async function updateAcademicYear(id: string, name: string): Promise<void> {
  await db.execute({
    sql: 'UPDATE academic_years SET name = ? WHERE id = ?',
    args: [name, id]
  });
}

export async function toggleAcademicYear(id: string, isActive: boolean): Promise<void> {
  if (isActive) {
    // Desactivar todos los años académicos
    await db.execute({
      sql: 'UPDATE academic_years SET is_active = false',
      args: []
    });
    // Activar solo el año seleccionado
    await db.execute({
      sql: 'UPDATE academic_years SET is_active = true WHERE id = ?',
      args: [id]
    });
  } else {
    // Si se desactiva, simplemente actualizamos ese año
    await db.execute({
      sql: 'UPDATE academic_years SET is_active = false WHERE id = ?',
      args: [id]
    });
  }
}

export async function deleteAcademicYear(id: string): Promise<void> {
  await db.execute({
    sql: 'DELETE FROM academic_years WHERE id = ?',
    args: [id]
  });
}

export async function getStudentsByCourse(courseId: string): Promise<Student[]> {
  const result = await db.execute({
    sql: `
      SELECT s.*, i.name as instrument_name, l.name as level_name, c.name as course_name
      FROM students s
      JOIN instruments i ON s.instrument_id = i.id
      JOIN levels l ON s.level_id = l.id
      JOIN courses c ON s.course_id = c.id
      WHERE s.course_id = ?
      ORDER BY s.first_name, s.last_name
    `,
    args: [courseId]
  });

  return result.rows.map(row => ({
    id: row.id as string,
    firstName: row.first_name as string,
    lastName: row.last_name as string,
    email: row.email as string,
    address: row.address as string,
    identifier: row.identifier as string,
    instrumentId: row.instrument_id as string,
    levelId: row.level_id as string,
    courseId: row.course_id as string,
    instrumentName: row.instrument_name as string,
    levelName: row.level_name as string,
    courseName: row.course_name as string,
  }));
}

export async function getStudents(): Promise<Student[]> {
  const result = await db.execute({
    sql: `
      SELECT s.*, i.name as instrument_name, l.name as level_name, c.name as course_name
      FROM students s
      JOIN instruments i ON s.instrument_id = i.id
      JOIN levels l ON s.level_id = l.id
      JOIN courses c ON s.course_id = c.id
      ORDER BY s.first_name, s.last_name
    `,
    args: []
  });

  return result.rows.map(row => ({
    id: row.id as string,
    firstName: row.first_name as string,
    lastName: row.last_name as string,
    email: row.email as string,
    address: row.address as string,
    identifier: row.identifier as string,
    instrumentId: row.instrument_id as string,
    levelId: row.level_id as string,
    courseId: row.course_id as string,
    instrumentName: row.instrument_name as string,
    levelName: row.level_name as string,
    courseName: row.course_name as string,
  }));
}

export async function createStudent(student: Omit<Student, 'id'>): Promise<Student> {
  const id = crypto.randomUUID();
  await db.execute({
    sql: `
      INSERT INTO students (
        id, 
        first_name, 
        last_name, 
        identifier, 
        email, 
        phone,
        address, 
        birth_date,
        course_id, 
        instrument_id
      ) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    args: [
      id,
      student.firstName,
      student.lastName,
      student.identifier,
      student.email,
      student.phone || null,
      student.address || null,
      student.birthDate || null,
      student.courseId,
      student.instrumentId
    ]
  });

  // Obtener información adicional del curso e instrumento
  const result = await db.execute({
    sql: `
      SELECT 
        s.*, 
        c.name as course_name,
        i.name as instrument_name,
        l.name as level_name
      FROM students s
      JOIN courses c ON s.course_id = c.id
      JOIN instruments i ON s.instrument_id = i.id
      JOIN levels l ON c.level_id = l.id
      WHERE s.id = ?
    `,
    args: [id]
  });

  const row = result.rows[0];
  return {
    id: row.id as string,
    firstName: row.first_name as string,
    lastName: row.last_name as string,
    identifier: row.identifier as string,
    email: row.email as string,
    phone: row.phone as string,
    address: row.address as string,
    birthDate: row.birth_date as string,
    courseId: row.course_id as string,
    courseName: row.course_name as string,
    instrumentId: row.instrument_id as string,
    instrumentName: row.instrument_name as string,
    levelName: row.level_name as string
  };
}

export async function updateStudent(id: string, student: Omit<Student, 'id'>): Promise<Student> {
  await db.execute({
    sql: `
      UPDATE students 
      SET 
        first_name = ?, 
        last_name = ?, 
        identifier = ?, 
        email = ?,
        phone = ?,
        address = ?, 
        birth_date = ?,
        course_id = ?, 
        instrument_id = ?
      WHERE id = ?
    `,
    args: [
      student.firstName,
      student.lastName,
      student.identifier,
      student.email,
      student.phone || null,
      student.address || null,
      student.birthDate || null,
      student.courseId,
      student.instrumentId,
      id
    ]
  });

  // Obtener información actualizada
  const result = await db.execute({
    sql: `
      SELECT 
        s.*, 
        c.name as course_name,
        i.name as instrument_name,
        l.name as level_name
      FROM students s
      JOIN courses c ON s.course_id = c.id
      JOIN instruments i ON s.instrument_id = i.id
      JOIN levels l ON c.level_id = l.id
      WHERE s.id = ?
    `,
    args: [id]
  });

  const row = result.rows[0];
  return {
    id: row.id as string,
    firstName: row.first_name as string,
    lastName: row.last_name as string,
    identifier: row.identifier as string,
    email: row.email as string,
    phone: row.phone as string,
    address: row.address as string,
    birthDate: row.birth_date as string,
    courseId: row.course_id as string,
    courseName: row.course_name as string,
    instrumentId: row.instrument_id as string,
    instrumentName: row.instrument_name as string,
    levelName: row.level_name as string
  };
}

export async function deleteStudents(ids: string[]): Promise<void> {
  await db.execute({
    sql: 'DELETE FROM students WHERE id IN (' + ids.map(() => '?').join(',') + ')',
    args: ids
  });
}

// Funciones para asignaturas grupales
export async function getGroupSubjects(): Promise<GroupSubject[]> {
  const result = await db.execute('SELECT * FROM group_subjects ORDER BY name');
  return result.rows.map(row => ({
    id: row.id as string,
    name: row.name as string,
  }));
}

export async function createGroupSubject(name: string): Promise<GroupSubject> {
  // Generamos un ID único
  const id = crypto.randomUUID();
  
  const result = await db.execute({
    sql: `INSERT INTO group_subjects (id, name) VALUES (?, ?) RETURNING id, name`,
    args: [id, name]
  });

  const row = result.rows[0];
  return {
    id: row.id as string,
    name: row.name as string,
  };
}

export async function updateGroupSubject(id: string, name: string): Promise<void> {
  await db.execute({
    sql: 'UPDATE group_subjects SET name = ? WHERE id = ?',
    args: [name, id]
  });
}

export async function deleteGroupSubject(id: string): Promise<void> {
  await db.execute({
    sql: 'DELETE FROM group_subjects WHERE id = ?',
    args: [id]
  });
}

// Funciones para profesores
export async function getTeachers(): Promise<Teacher[]> {
  const result = await db.execute(`
    SELECT 
      t.*,
      i.name as instrument_name,
      GROUP_CONCAT(DISTINCT tc.course_id) as course_ids,
      GROUP_CONCAT(DISTINCT c.name) as course_names
    FROM teachers t
    LEFT JOIN instruments i ON t.instrument_id = i.id
    LEFT JOIN teacher_courses tc ON t.id = tc.teacher_id
    LEFT JOIN courses c ON tc.course_id = c.id
    GROUP BY t.id
  `);

  const teachers = await Promise.all(result.rows.map(async (row) => {
    // Obtener las asignaturas para cada profesor
    const subjectsResult = await db.execute({
      sql: `
        SELECT course_id, subject_name, subject_type
        FROM teacher_course_subjects
        WHERE teacher_id = ?
      `,
      args: [row.id]
    });

    // Organizar las asignaturas por curso
    const courseSubjects = subjectsResult.rows.reduce((acc: any, subject: any) => {
      if (!acc[subject.course_id]) {
        acc[subject.course_id] = [];
      }
      acc[subject.course_id].push({
        name: subject.subject_name,
        type: subject.subject_type
      });
      return acc;
    }, {});

    return {
      id: row.id as string,
      firstName: row.first_name as string,
      lastName: row.last_name as string,
      identifier: row.identifier as string,
      email: row.email as string,
      username: row.username as string,
      instrumentId: row.instrument_id as string,
      instrumentName: row.instrument_name as string,
      courseIds: row.course_ids ? (row.course_ids as string).split(',') : [],
      courseNames: row.course_names ? (row.course_names as string).split(',') : [],
      courseSubjects: courseSubjects
    };
  }));

  return teachers;
}

export async function createTeacher(
  teacherData: Omit<Teacher, 'id'>,
  courseIds: string[]
): Promise<Teacher> {
  const id = crypto.randomUUID();
  
  try {
    // Asegurarse de que hay una contraseña
    if (!teacherData.password) {
      teacherData.password = 'password'; // Contraseña por defecto
    }
    
    // Crear el profesor
    await db.execute({
      sql: `
        INSERT INTO teachers (id, first_name, last_name, identifier, email, username, password, instrument_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        id,
        teacherData.firstName,
        teacherData.lastName,
        teacherData.identifier,
        teacherData.email,
        teacherData.username,
        teacherData.password,
        teacherData.instrumentId
      ]
    });

    // Permisos por defecto para profesores
    const defaultPermissions: Permission[] = [
      'view_students',
      'view_courses',
      'view_grades',
      'edit_grades',
      'view_report_cards'
    ] as Permission[];

    // Crear el usuario asociado al profesor
    await createUser({
      username: teacherData.username,
      password: teacherData.password || 'password', // Usar la contraseña proporcionada o una por defecto
      email: teacherData.email,
      role: 'teacher',
      isActive: true,
      teacherId: id,
      permissions: defaultPermissions
    });

    // Insertar las relaciones con los cursos
    if (courseIds.length > 0) {
      const values = courseIds.map(courseId => 
        `('${id}', '${courseId}')`
      ).join(',');

      await db.execute(`
        INSERT INTO teacher_courses (teacher_id, course_id)
        VALUES ${values}
      `);
    }

    // Recuperar el profesor creado con su información completa
    return getTeacher(id);
  } catch (error) {
    console.error('Error en createTeacher:', error);
    throw error;
  }
}

export async function getTeacher(id: string): Promise<Teacher> {
  const result = await db.execute({
    sql: `
      SELECT 
        t.*,
        i.name as instrument_name,
        GROUP_CONCAT(tc.course_id) as course_ids
      FROM teachers t
      LEFT JOIN instruments i ON t.instrument_id = i.id
      LEFT JOIN teacher_courses tc ON t.id = tc.teacher_id
      WHERE t.id = ?
      GROUP BY t.id
    `,
    args: [id]
  });

  if (!result.rows.length) {
    throw new Error('Profesor no encontrado');
  }

  const row = result.rows[0];
  return {
    id: row.id as string,
    firstName: row.first_name as string,
    lastName: row.last_name as string,
    identifier: row.identifier as string,
    email: row.email as string,
    username: row.username as string,
    password: row.password as string,
    instrumentId: row.instrument_id as string,
    instrumentName: row.instrument_name as string,
    courseIds: row.course_ids ? (row.course_ids as string).split(',') : []
  };
}

export async function updateTeacher(
  id: string,
  teacherData: Partial<Teacher>,
  courseIds?: string[]
): Promise<void> {
  try {
    // Actualizar el profesor
    await db.execute({
      sql: `
        UPDATE teachers
        SET first_name = ?,
            last_name = ?,
            identifier = ?,
            email = ?,
            username = ?,
            instrument_id = ?
        WHERE id = ?
      `,
      args: [
        teacherData.firstName || '', // Usar cadena vacía si es undefined
        teacherData.lastName || '',
        teacherData.identifier || '',
        teacherData.email || '',
        teacherData.username || '',
        teacherData.instrumentId || null, // Usar null si es undefined
        id
      ]
    });

    // Actualizar el usuario asociado
    if (teacherData.username || teacherData.email) {
      // Buscar el usuario asociado al profesor
      const userResult = await db.execute({
        sql: 'SELECT id FROM users WHERE teacher_id = ?',
        args: [id]
      });

      if (userResult.rows.length > 0) {
        const userId = userResult.rows[0].id as string;
        
        // Actualizar el usuario
        const updateData: Partial<User> = {
          username: teacherData.username || '', // Usar cadena vacía si es undefined
          email: teacherData.email || '',
          role: 'teacher',
          isActive: true,
          teacherId: id
        };
        
        // Si se proporciona una contraseña, actualizarla también
        if (teacherData.password) {
          updateData.password = teacherData.password;
        }
        
        await updateUser(userId, updateData);
      }
    }

    // Eliminar las asignaciones de cursos existentes
    await db.execute({
      sql: 'DELETE FROM teacher_courses WHERE teacher_id = ?',
      args: [id]
    });

    // Luego insertamos las nuevas asignaciones
    if (courseIds && courseIds.length > 0) {
      const values = courseIds.map(courseId => 
        `('${id}', '${courseId}')`
      ).join(',');
      
      await db.execute({
        sql: `INSERT INTO teacher_courses (teacher_id, course_id) VALUES ${values}`,
        args: []
      });
    }

    return;
  } catch (error) {
    console.error('Error al actualizar profesor:', error);
    throw error;
  }
}

export async function deleteTeacher(id: string): Promise<void> {
  try {
    // Primero, eliminar el usuario asociado al profesor
    await db.execute({
      sql: 'DELETE FROM users WHERE teacher_id = ?',
      args: [id]
    });
    
    // Luego, eliminar las asignaciones de cursos
    await db.execute({
      sql: 'DELETE FROM teacher_courses WHERE teacher_id = ?',
      args: [id]
    });
    
    // Eliminar las asignaciones de asignaturas
    await db.execute({
      sql: 'DELETE FROM teacher_course_subjects WHERE teacher_id = ?',
      args: [id]
    });
    
    // Finalmente, eliminar el profesor
    await db.execute({
      sql: 'DELETE FROM teachers WHERE id = ?',
      args: [id]
    });
  } catch (error) {
    console.error('Error al eliminar profesor:', error);
    throw error;
  }
}

// Funciones para plantillas de curso
export async function getCourseTemplates(): Promise<CourseTemplate[]> {
  const templatesResult = await db.execute(`
    SELECT 
      ct.*,
      l.name as level_name
    FROM course_templates ct
    LEFT JOIN levels l ON ct.level_id = l.id
  `);

  const templates = await Promise.all(templatesResult.rows.map(async (row) => {
    const subjectsResult = await db.execute({
      sql: `
        SELECT 
          id,
          name,
          type,
          is_required as isRequired
        FROM course_template_subjects
        WHERE template_id = ?
        ORDER BY name
      `,
      args: [row.id]
    });

    const subjects: CourseTemplateSubject[] = subjectsResult.rows.map(subject => ({
      id: subject.id as string,
      name: subject.name as string,
      type: subject.type as 'individual' | 'group',
      isRequired: Boolean(subject.isRequired)
    }));

    return {
      id: row.id as string,
      name: row.name as string,
      levelId: row.level_id as string,
      courseId: row.course_id as string,
      academicYear: row.academic_year as string,
      levelName: row.level_name as string,
      subjects: subjects
    };
  }));

  return templates;
}

export async function createCourseTemplate(template: Omit<CourseTemplate, 'id'>): Promise<CourseTemplate> {
  const id = crypto.randomUUID();
  try {
    await db.execute({
      sql: `
        INSERT INTO course_templates (id, name, level_id, course_id, academic_year)
        VALUES (?, ?, ?, ?, ?)
      `,
      args: [
        id,
        template.name,
        template.levelId,
        template.courseId,
        template.academicYear.toString()
      ]
    });
    
    // Si la plantilla tiene asignaturas, insertarlas en course_template_subjects
    if (template.subjects.length > 0) {
      const values = template.subjects.map((subject: CourseTemplateSubject) => 
        `('${crypto.randomUUID()}', '${id}', '${subject.name}', '${subject.type}', ${subject.isRequired ? 1 : 0})`
      ).join(',');
      
      await db.execute(`
        INSERT INTO course_template_subjects (id, template_id, name, type, is_required)
        VALUES ${values}
      `);
    }
  } catch (error) {
    console.error('Error creating course template:', error);
    throw error;
  }
  return {
    ...template,
    id
  };
}

export async function updateCourseTemplate(
  id: string,
  template: Omit<CourseTemplate, 'id' | 'levelName'>
): Promise<void> {
  // Actualizar plantilla
  await db.execute({
    sql: `
      UPDATE course_templates 
      SET name = ?, level_id = ?
      WHERE id = ?
    `,
    args: [template.name, template.levelId, id]
  });

  // Eliminar asignaturas existentes
  await db.execute({
    sql: 'DELETE FROM course_template_subjects WHERE template_id = ?',
    args: [id]
  });

  // Insertar nuevas asignaturas
  if (template.subjects.length > 0) {
    const values = template.subjects.map((subject: CourseTemplateSubject) => 
      `('${crypto.randomUUID()}', '${id}', '${subject.name}', '${subject.type}', ${subject.isRequired ? 1 : 0})`
    ).join(',');

    await db.execute(`
      INSERT INTO course_template_subjects (id, template_id, name, type, is_required)
      VALUES ${values}
    `);
  }
}

export async function deleteCourseTemplate(id: string): Promise<void> {
  await db.execute({
    sql: 'DELETE FROM course_templates WHERE id = ?',
    args: [id]
  });
}

export async function assignTeacherSubjects(
  teacherId: string,
  courseId: string,
  subjects: Array<{name: string, type: 'individual' | 'group'}>
): Promise<void> {
  try {
    // Primero eliminamos todas las asignaturas existentes para este profesor y curso
    await db.execute({
      sql: 'DELETE FROM teacher_course_subjects WHERE teacher_id = ? AND course_id = ?',
      args: [teacherId, courseId]
    });

    // Si hay nuevas asignaturas para asignar, las insertamos
    if (subjects.length > 0) {
      const values = subjects.map(subject => 
        `('${crypto.randomUUID()}', '${teacherId}', '${courseId}', '${subject.name}', '${subject.type}')`
      ).join(',');

      await db.execute(`
        INSERT INTO teacher_course_subjects (id, teacher_id, course_id, subject_name, subject_type)
        VALUES ${values}
      `);
    }
  } catch (error) {
    console.error('Error en assignTeacherSubjects:', error);
    throw error;
  }
}

export async function getTeacherSubjects(teacherId: string): Promise<TeacherCourseSubject[]> {
  try {
    // Primero, obtener todos los cursos asignados al profesor
    const teacherCoursesResult = await db.execute({
      sql: `
        SELECT course_id 
        FROM teacher_courses 
        WHERE teacher_id = ?
      `,
      args: [teacherId]
    });
    
    const courseIds = teacherCoursesResult.rows.map(row => row.course_id as string);
    
    if (courseIds.length === 0) {
      return [];
    }
    
    // Luego, obtener las asignaturas específicas asignadas al profesor
    const subjectsResult = await db.execute({
      sql: `
        SELECT 
          tcs.id,
          tcs.teacher_id,
          tcs.course_id,
          tcs.subject_name,
          tcs.subject_type,
          c.name as course_name,
          c.level_id,
          l.name as level_name
        FROM teacher_course_subjects tcs
        JOIN courses c ON tcs.course_id = c.id
        JOIN levels l ON c.level_id = l.id
        WHERE tcs.teacher_id = ?
      `,
      args: [teacherId]
    });
    
    // Si no hay asignaturas específicas, devolver los cursos asignados como asignaturas genéricas
    if (subjectsResult.rows.length === 0) {
      // Obtener información de los cursos asignados
      const coursesResult = await db.execute({
        sql: `
          SELECT 
            c.id as course_id,
            c.name as course_name,
            c.level_id,
            l.name as level_name
          FROM courses c
          JOIN levels l ON c.level_id = l.id
          WHERE c.id IN (${courseIds.map(() => '?').join(',')})
        `,
        args: courseIds
      });
      
      // Crear asignaturas genéricas para cada curso
      return coursesResult.rows.map(row => ({
        id: crypto.randomUUID(), // Generar un ID único para cada asignatura genérica
        teacherId,
        courseId: row.course_id as string,
        courseName: row.course_name as string,
        levelId: row.level_id as string,
        levelName: row.level_name as string,
        subjectName: 'General', // Asignatura genérica
        subjectType: 'individual' as const // Tipo por defecto con aserción de tipo
      }));
    }
    
    // Mapear los resultados a objetos TeacherCourseSubject
    return subjectsResult.rows.map(row => ({
      id: row.id as string, // Usar el ID de la base de datos
      teacherId,
      courseId: row.course_id as string,
      courseName: row.course_name as string,
      levelId: row.level_id as string,
      levelName: row.level_name as string,
      subjectName: row.subject_name as string,
      subjectType: (row.subject_type as string === 'group' ? 'group' : 'individual') as 'group' | 'individual' // Asegurar que el tipo es correcto
    }));
  } catch (error) {
    console.error('Error al obtener asignaturas del profesor:', error);
    throw error;
  }
}

// Funciones para boletines
export async function getReportCard(courseId: string): Promise<ReportCardState | null> {
  const result = await db.execute({
    sql: 'SELECT * FROM report_cards WHERE course_id = ?',
    args: [courseId]
  });

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  const sections = JSON.parse(row.sections as string);
  const subjects = JSON.parse(row.subjects as string);

  // Asegurarnos de que los campos mantienen su tipo al cargar
  const sectionsWithFields = sections.map((section: Section) => ({
    ...section,
    fields: section.fields.map((field: Field) => ({
      ...field,
      type: field.type || 'select'
    }))
  }));

  return {
    id: row.id as string,
    courseId: row.course_id as string,
    sections: sectionsWithFields,
    subjects: subjects
  };
}

export async function getCourseData(courseId: string): Promise<any> {
  try {
    const result = await db.execute({
      sql: 'SELECT * FROM courses WHERE id = ?',
      args: [courseId]
    });

    if (result.rows.length === 0) {
      throw new Error(`No se encontró el curso con ID: ${courseId}`);
    }

    return result.rows[0];
  } catch (error) {
    console.error('Error al obtener datos del curso:', error);
    throw error;
  }
}

export const verifyTemplateAssignment = async (courseId: string): Promise<boolean> => {
  try {
    const result = await db.execute({
      sql: 'SELECT template_id FROM courses WHERE id = ?',
      args: [courseId]
    });
    
    const hasTemplate = result.rows.length > 0 && result.rows[0].template_id != null;
    
    if (!hasTemplate) {
      console.log('Course has no template_id assigned');
    }
    
    return hasTemplate;
  } catch (error) {
    console.error('Error verifying template assignment:', error);
    return false;
  }
};

export async function saveReportCard(reportCard: ReportCardState, templateId: string): Promise<void> {
  try {
    // Asegurarnos de que las secciones incluyen todos los campos necesarios
    const sectionsWithFields = reportCard.sections.map((section: Section) => ({
      ...section,
      fields: section.fields.map((field: Field) => ({
        ...field,
        // Asegurarnos de que el tipo se mantiene al guardar
        type: field.type || 'select'
      }))
    }));

    await db.execute({
      sql: `
        INSERT INTO report_cards (id, course_id, sections, subjects)
        VALUES (?, ?, ?, ?)
        ON CONFLICT (course_id) DO UPDATE SET
          sections = excluded.sections,
          subjects = excluded.subjects,
          updated_at = CURRENT_TIMESTAMP
      `,
      args: [
        reportCard.id,
        reportCard.courseId,
        JSON.stringify(sectionsWithFields), // Guardamos las secciones con todos sus campos
        JSON.stringify(reportCard.subjects)
      ]
    });

    console.log('Boletín guardado exitosamente con observaciones:', {
      id: reportCard.id,
      courseId: reportCard.courseId,
      templateId: templateId
    });

  } catch (error) {
    console.error('Error saving report card:', error);
    throw error;
  }
}

// Funciones para grupos de criterios
export async function getCriteriaGroups(): Promise<CriteriaGroup[]> {
  const result = await db.execute('SELECT * FROM criteria_groups ORDER BY name');
  return result.rows.map(row => ({
    id: row.id as string,
    name: row.name as string,
    criteria: JSON.parse(row.criteria as string)
  }));
}

export async function saveCriteriaGroup(group: Omit<CriteriaGroup, 'id'>): Promise<CriteriaGroup> {
  const id = crypto.randomUUID();
  await db.execute({
    sql: 'INSERT INTO criteria_groups (id, name, criteria) VALUES (?, ?, ?)',
    args: [id, group.name, JSON.stringify(group.criteria)]
  });
  return { ...group, id };
}

export async function deleteCriteriaGroup(id: string): Promise<void> {
  await db.execute({
    sql: 'DELETE FROM criteria_groups WHERE id = ?',
    args: [id]
  });
}

// Añadir función para asignar plantilla a curso
export async function assignTemplateToCourse(courseId: string, templateId: string): Promise<void> {
  await db.execute({
    sql: `UPDATE courses SET template_id = ? WHERE id = ?`,
    args: [templateId, courseId]
  });
}

// Añadir función para manejar errores de conexión
export async function executeWithRetry<T>(
  operation: () => Promise<T>,
  retries = 3,
  delay = 1000
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (retries > 0 && error instanceof Error && error.message.includes('ERR_INTERNET_DISCONNECTED')) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return executeWithRetry(operation, retries - 1, delay * 2);
    }
    throw error;
  }
}

export async function updateCourseTemplateAndYear(
  courseId: string, 
  templateId: string, 
  academicYear: string
): Promise<void> {
  // Primero obtenemos el academic_year_id sin depender del is_active
  const yearResult = await db.execute({
    sql: 'SELECT id FROM academic_years WHERE name = ?',
    args: [academicYear]
  });

  if (!yearResult.rows.length) {
    throw new Error(`No se encontró el año académico ${academicYear}`);
  }

  const academicYearId = yearResult.rows[0].id;

  // Luego actualizamos el curso con los IDs correctos
  await db.execute({
    sql: `
      UPDATE courses 
      SET template_id = ?,
          academic_year_id = ?
      WHERE id = ?
    `,
    args: [templateId, academicYearId, courseId]
  });

  // Verificamos que la actualización fue exitosa
  const verification = await db.execute({
    sql: `
      SELECT template_id, academic_year_id 
      FROM courses 
      WHERE id = ?
    `,
    args: [courseId]
  });

  const updated = verification.rows[0];
  if (!updated?.template_id || !updated?.academic_year_id) {
    throw new Error('Error al actualizar el curso: los IDs no se guardaron correctamente');
  }
}

export async function getStudentGrades(studentId: string, courseId: string) {
  try {
    console.log('Obteniendo calificaciones para:', { studentId, courseId });
    
    const result = await db.execute({
      sql: `SELECT * FROM student_grades WHERE student_id = ? AND course_id = ?`,
      args: [studentId, courseId]
    });

    if (result.rows.length === 0) {
      console.log('No se encontraron calificaciones para este estudiante y curso');
      return null;
    }

    const row = result.rows[0];
    
    // Depuración para ver qué datos se están recibiendo
    console.log('Datos crudos de la BD:', row);
    
    // Parsear los criterios adicionales
    const additionalCriteria = row.additional_criteria 
      ? JSON.parse(row.additional_criteria as string) 
      : [];
    
    console.log('Criterios adicionales parseados:', additionalCriteria);
    
    return {
      id: row.id as string,
      studentId: row.student_id as string,
      courseId: row.course_id as string,
      templateId: row.template_id as string,
      academicYear: row.academic_year as string,
      grades: JSON.parse(row.grades as string),
      additionalCriteria: additionalCriteria
    };
  } catch (error) {
    console.error('Error al obtener calificaciones del estudiante:', error);
    throw error;
  }
}

export async function saveStudentGrades({
  studentId,
  courseId,
  templateId,
  academicYear,
  grades,
  additionalCriteria
}: {
  studentId: string;
  courseId: string;
  templateId: string;
  academicYear: string;
  grades: Grades;
  additionalCriteria: AdditionalCriterion[];
}): Promise<void> {
  try {
    console.log('Guardando calificaciones:', {
      studentId,
      courseId,
      templateId,
      grades,
      additionalCriteria
    });

    await db.execute({
      sql: `
        INSERT INTO student_grades (
          student_id,
          course_id,
          template_id,
          academic_year,
          grades,
          additional_criteria,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT (student_id, course_id, template_id, academic_year) 
        DO UPDATE SET
          grades = excluded.grades,
          additional_criteria = excluded.additional_criteria,
          updated_at = CURRENT_TIMESTAMP
      `,
      args: [
        studentId,
        courseId,
        templateId,
        academicYear,
        JSON.stringify(grades),
        JSON.stringify(additionalCriteria)
      ]
    });

    console.log('Calificaciones guardadas exitosamente');
  } catch (error) {
    console.error('Error en saveStudentGrades:', error);
    throw error;
  }
}

export async function getCenterConfig() {
  const result = await db.execute('SELECT * FROM center_config LIMIT 1');
  
  if (result.rows.length === 0) return null;
  
  return {
    id: result.rows[0].id as string,
    name: result.rows[0].name as string,
    logo: result.rows[0].logo as string | undefined
  };
}

export async function saveCenterConfig(config: { id: string; name: string; logo?: string }) {
  await db.execute({
    sql: `
      INSERT INTO center_config (id, name, logo)
      VALUES (?, ?, ?)
      ON CONFLICT (id) DO UPDATE SET
        name = excluded.name,
        logo = excluded.logo,
        updated_at = CURRENT_TIMESTAMP
    `,
    args: [config.id, config.name, config.logo || null]
  });
}

// Funciones para criterios de evaluación
export async function getEvaluationCriteria(): Promise<EvaluationCriterion[]> {
  const result = await db.execute('SELECT * FROM evaluation_criteria ORDER BY `order`');
  return result.rows.map(row => ({
    id: row.id as string,
    label: row.label as string,
    value: row.value as string,
    order: row.order as number,
    isDefault: Boolean(Number(row.is_default))
  }));
}

export async function saveEvaluationCriterion(criterion: Omit<EvaluationCriterion, 'id'>): Promise<EvaluationCriterion> {
  const id = crypto.randomUUID();
  await db.execute({
    sql: 'INSERT INTO evaluation_criteria (id, label, value, `order`, is_default) VALUES (?, ?, ?, ?, ?)',
    args: [id, criterion.label, criterion.value, criterion.order, criterion.isDefault ? 1 : 0]
  });
  return { ...criterion, id };
}

export async function updateEvaluationCriterion(id: string, criterion: Partial<EvaluationCriterion>): Promise<void> {
  const updates: string[] = [];
  const args: any[] = [];

  if (criterion.label !== undefined) {
    updates.push('label = ?');
    args.push(criterion.label);
  }
  if (criterion.value !== undefined) {
    updates.push('value = ?');
    args.push(criterion.value);
  }
  if (criterion.order !== undefined) {
    updates.push('`order` = ?');
    args.push(criterion.order);
  }
  if (criterion.isDefault !== undefined) {
    updates.push('is_default = ?');
    args.push(criterion.isDefault ? 1 : 0);
  }

  if (updates.length > 0) {
    args.push(id);
    await db.execute({
      sql: `UPDATE evaluation_criteria SET ${updates.join(', ')} WHERE id = ?`,
      args
    });
  }
}

export async function deleteEvaluationCriterion(id: string): Promise<void> {
  await db.execute({
    sql: 'DELETE FROM evaluation_criteria WHERE id = ?',
    args: [id]
  });
}

export async function updateEvaluationCriteriaOrder(criteria: EvaluationCriterion[]): Promise<void> {
  const updates = criteria.map((criterion, index) => 
    `('${criterion.id}', '${criterion.label}', '${criterion.value}', ${index}, ${criterion.isDefault ? 1 : 0})`
  ).join(',');

  await db.execute(`
    INSERT INTO evaluation_criteria (id, label, value, \`order\`, is_default)
    VALUES ${updates}
    ON CONFLICT (id) DO UPDATE SET
      label = excluded.label,
      value = excluded.value,
      \`order\` = excluded.\`order\`,
      is_default = excluded.is_default
  `);
}

// Funciones para gestión de usuarios
export async function getUsers(): Promise<User[]> {
  const result = await db.execute('SELECT * FROM users ORDER BY username');
  return result.rows.map(row => ({
    id: row.id as string,
    username: row.username as string,
    role: row.role as 'admin' | 'teacher',
    email: row.email as string,
    isActive: Boolean(row.is_active),
    teacherId: row.teacher_id as string | undefined,
    permissions: row.permissions ? JSON.parse(row.permissions as string) : []
  }));
}

export async function createUser(userData: Partial<User>): Promise<void> {
  const id = crypto.randomUUID();
  
  // Verificar que los campos requeridos existen
  if (!userData.username || !userData.role || !userData.email) {
    throw new Error('Faltan campos requeridos para crear usuario');
  }
  
  // Si es admin, dar todos los permisos
  let permissions = userData.permissions || [];
  if (userData.role === 'admin') {
    permissions = [
      'view_students', 'edit_students',
      'view_courses', 'edit_courses',
      'view_grades', 'edit_grades',
      'view_report_cards', 'edit_report_cards',
      'view_teachers', 'edit_teachers',
      'view_teacher_subjects', 'edit_teacher_subjects'
    ] as Permission[];
  }
  
  await db.execute({
    sql: `
      INSERT INTO users (id, username, role, email, is_active, teacher_id, password, permissions)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    args: [
      id,
      userData.username,
      userData.role,
      userData.email,
      userData.isActive ? 1 : 0,
      userData.teacherId || null,
      userData.password || null,
      permissions.length ? JSON.stringify(permissions) : null
    ]
  });
}

export async function updateUser(id: string, userData: Partial<User>): Promise<void> {
  // Verificar que los campos requeridos existen
  if (!userData.username || !userData.role || !userData.email) {
    throw new Error('Faltan campos requeridos para actualizar usuario');
  }
  
  // Si es admin, dar todos los permisos
  let permissions = userData.permissions || [];
  if (userData.role === 'admin') {
    permissions = [
      'view_students', 'edit_students',
      'view_courses', 'edit_courses',
      'view_grades', 'edit_grades',
      'view_report_cards', 'edit_report_cards',
      'view_teachers', 'edit_teachers',
      'view_teacher_subjects', 'edit_teacher_subjects'
    ] as Permission[];
  }
  
  // Construir la consulta SQL base
  let sql = `
    UPDATE users
    SET username = ?,
        role = ?,
        email = ?,
        is_active = ?,
        teacher_id = ?,
        permissions = ?
  `;
  
  // Preparar los argumentos base
  let args = [
    userData.username,
    userData.role,
    userData.email,
    userData.isActive ? 1 : 0,
    userData.teacherId || null,
    permissions.length ? JSON.stringify(permissions) : null
  ];
  
  // Si se proporciona una contraseña, añadirla a la actualización
  if (userData.password) {
    sql += `, password = ?`;
    args.push(userData.password);
  }
  
  // Completar la consulta con la condición WHERE
  sql += ` WHERE id = ?`;
  args.push(id);
  
  // Ejecutar la consulta
  await db.execute({
    sql,
    args
  });
}

export async function deleteUser(id: string): Promise<void> {
  await db.execute({
    sql: 'DELETE FROM users WHERE id = ?',
    args: [id]
  });
}

// Añadir esta función para migrar datos de teachers a users
export async function migrateTeachersToUsers(): Promise<void> {
  try {
    // Obtener todos los profesores
    const teachers = await getTeachers();
    
    // Para cada profesor, verificar si ya tiene un usuario
    for (const teacher of teachers) {
      const existingUser = await db.execute({
        sql: 'SELECT id, username FROM users WHERE teacher_id = ?',
        args: [teacher.id]
      });
      
      // Si no tiene usuario, crear uno
      if (existingUser.rows.length === 0) {
        // Crear un nombre de usuario basado en el nombre y apellido
        const username = teacher.username || `${teacher.firstName.toLowerCase()}.${teacher.lastName.toLowerCase()}`.replace(/\s+/g, '');
        
        // Permisos por defecto para profesores
        const defaultPermissions: Permission[] = [
          'view_students',
          'view_courses',
          'view_grades',
          'edit_grades',
          'view_report_cards'
        ] as Permission[];
        
        // Crear el usuario
        await createUser({
          username,
          password: 'password', // Contraseña temporal
          email: teacher.email,
          role: 'teacher',
          teacherId: teacher.id,
          isActive: true,
          permissions: defaultPermissions
        });
        
        console.log(`Usuario creado para el profesor ${teacher.firstName} ${teacher.lastName}`);
      } 
      // Si el usuario existe pero tiene un nombre de usuario diferente al del profesor, actualizarlo
      else if (teacher.username && existingUser.rows[0].username !== teacher.username) {
        await db.execute({
          sql: 'UPDATE users SET username = ? WHERE teacher_id = ?',
          args: [teacher.username, teacher.id]
        });
        
        console.log(`Usuario actualizado para el profesor ${teacher.firstName} ${teacher.lastName}`);
      }
    }
    
    // También verificar si hay usuarios de tipo profesor que no están vinculados a ningún profesor
    const unlinkedUsers = await db.execute({
      sql: `
        SELECT u.id, u.username 
        FROM users u 
        LEFT JOIN teachers t ON u.teacher_id = t.id 
        WHERE u.role = 'teacher' AND t.id IS NULL
      `,
      args: []
    });
    
    if (unlinkedUsers.rows.length > 0) {
      console.log(`Se encontraron ${unlinkedUsers.rows.length} usuarios de tipo profesor sin vincular a un profesor real`);
    }
    
  } catch (error) {
    console.error('Error al migrar profesores a usuarios:', error);
  }
}

// Función para inicializar la base de datos con un usuario admin
export async function initializeDatabase(): Promise<void> {
  try {
    // Crear el esquema si no existe
    await createSchema(db);
    
    // Actualizar el usuario admin existente si es necesario
    await updateAdminUser();
    
    // Verificar si ya existe un usuario admin
    const adminExists = await db.execute({
      sql: 'SELECT COUNT(*) as count FROM users WHERE role = ? AND username = ?',
      args: ['admin', 'admin']
    });
    
    // Convertir explícitamente a número
    const count = Number(adminExists.rows[0]?.count || 0);
    
    if (count === 0) {
      // Crear usuario admin por defecto
      await createUser({
        username: 'admin',
        password: 'admin',
        email: 'admin@example.com',
        role: 'admin',
        isActive: true
      });
      console.log('Usuario administrador creado con éxito');
    }
    
    // Sincronizar profesores existentes con usuarios
    await syncTeachersAndUsers();
    
  } catch (error) {
    console.error('Error al inicializar la base de datos:', error);
    throw error;
  }
}

export async function updateUserPassword(id: string, newPassword: string): Promise<void> {
  await db.execute({
    sql: `
      UPDATE users
      SET password = ?
      WHERE id = ?
    `,
    args: [newPassword, id]
  });
}

// Función para actualizar el usuario admin existente
export async function updateAdminUser(): Promise<void> {
  try {
    // Verificar si existe un usuario adminadmin
    const adminExists = await db.execute({
      sql: 'SELECT id FROM users WHERE username = ?',
      args: ['adminadmin']
    });
    
    if (adminExists.rows.length > 0) {
      const adminId = adminExists.rows[0].id as string;
      
      // Actualizar el usuario adminadmin a admin
      await db.execute({
        sql: `
          UPDATE users
          SET username = ?, password = ?
          WHERE id = ?
        `,
        args: ['admin', 'admin', adminId]
      });
      
      console.log('Usuario administrador actualizado con éxito');
    }
  } catch (error) {
    console.error('Error al actualizar el usuario administrador:', error);
  }
}

export async function syncTeachersAndUsers(): Promise<void> {
  try {
    // 1. Obtener todos los profesores
    const teachers = await getTeachers();
    
    // 2. Obtener todos los usuarios de tipo profesor
    const teacherUsers = await db.execute({
      sql: 'SELECT id, username, teacher_id FROM users WHERE role = ?',
      args: ['teacher']
    });
    
    // Crear un mapa de profesores por ID
    const teachersMap = new Map(teachers.map(teacher => [teacher.id, teacher]));
    
    // Crear un mapa de usuarios por teacher_id
    const usersMap = new Map();
    for (const user of teacherUsers.rows) {
      if (user.teacher_id) {
        usersMap.set(user.teacher_id, user);
      }
    }
    
    // 3. Para cada profesor, verificar si tiene un usuario correspondiente
    for (const teacher of teachers) {
      const linkedUser = usersMap.get(teacher.id);
      
      if (!linkedUser) {
        // Si no tiene usuario, crear uno
        const username = teacher.username || `${teacher.firstName.toLowerCase()}.${teacher.lastName.toLowerCase()}`.replace(/\s+/g, '');
        
        const defaultPermissions: Permission[] = [
          'view_students',
          'view_courses',
          'view_grades',
          'edit_grades',
          'view_report_cards'
        ] as Permission[];
        
        await createUser({
          username,
          password: 'password', // Contraseña temporal
          email: teacher.email,
          role: 'teacher',
          teacherId: teacher.id,
          isActive: true,
          permissions: defaultPermissions
        });
        
        console.log(`Usuario creado para el profesor ${teacher.firstName} ${teacher.lastName}`);
      }
    }
    
    // 4. Para cada usuario de tipo profesor, verificar si está vinculado a un profesor real
    for (const user of teacherUsers.rows) {
      const teacherId = user.teacher_id;
      
      if (teacherId && !teachersMap.has(String(teacherId))) {
        console.log(`Usuario ${user.username} está vinculado a un profesor que no existe (ID: ${teacherId})`);
      }
    }
    
    console.log('Sincronización de profesores y usuarios completada');
    
  } catch (error) {
    console.error('Error al sincronizar profesores y usuarios:', error);
  }
}

export async function importStudents(students: any[]): Promise<Student[]> {
  try {
    const importedStudents: Student[] = [];
    
    // Procesar cada estudiante
    for (const studentData of students) {
      const id = crypto.randomUUID();
      
      // Insertar el estudiante en la base de datos
      await db.execute({
        sql: `
          INSERT INTO students (
            id, 
            first_name, 
            last_name, 
            identifier, 
            email, 
            phone, 
            address, 
            birth_date, 
            course_id, 
            level_id,
            instrument_id
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          id,
          studentData.firstName,
          studentData.lastName,
          studentData.identifier,
          studentData.email || null,
          studentData.phone || null,
          studentData.address || null,
          studentData.birthDate || null,
          studentData.courseId,
          studentData.levelId,
          studentData.instrumentId
        ]
      });
      
      // Obtener información del curso e instrumento
      const courseResult = await db.execute({
        sql: 'SELECT name FROM courses WHERE id = ?',
        args: [studentData.courseId]
      });
      
      const instrumentResult = await db.execute({
        sql: 'SELECT name FROM instruments WHERE id = ?',
        args: [studentData.instrumentId]
      });
      
      // Añadir el estudiante importado a la lista
      importedStudents.push({
        id,
        firstName: studentData.firstName,
        lastName: studentData.lastName,
        identifier: studentData.identifier,
        email: studentData.email || null,
        phone: studentData.phone || null,
        address: studentData.address || null,
        birthDate: studentData.birthDate || null,
        courseId: studentData.courseId,
        courseName: courseResult.rows[0]?.name as string || '',
        instrumentId: studentData.instrumentId,
        instrumentName: instrumentResult.rows[0]?.name as string || ''
      });
    }
    
    return importedStudents;
  } catch (error) {
    console.error('Error importing students:', error);
    throw error;
  }
}

// Email Configs con soporte para OAuth
export async function getEmailConfigs(): Promise<EmailConfig[]> {
  try {
    const result = await db.execute('SELECT * FROM email_configs ORDER BY is_default DESC');
    
    return result.rows.map(row => ({
      id: row.id as string,
      email: row.email as string,
      password: row.password ? decryptPassword(row.password as string) : undefined,
      isDefault: Boolean(row.is_default),
      authType: row.auth_type as 'password' | 'oauth',
      oauthCredentials: row.oauth_credentials 
        ? JSON.parse(decryptPassword(row.oauth_credentials as string))
        : undefined,
      templateId: row.template_id as string | undefined
    }));
  } catch (error) {
    console.error('Error getting email configs:', error);
    throw error;
  }
}

export async function saveEmailConfig(config: {
  email: string;
  password?: string;
  isDefault: boolean;
  authType: 'password' | 'oauth';
  oauthCredentials?: OAuthCredentials;
}) {
  const id = crypto.randomUUID();
  const encryptedPassword = config.password ? encryptPassword(config.password) : null;
  const encryptedOAuthCredentials = config.oauthCredentials 
    ? encryptPassword(JSON.stringify(config.oauthCredentials))
    : null;
  
  const { rows } = await db.execute({
    sql: `
      INSERT INTO email_configs (
        id, 
        email, 
        password, 
        is_default, 
        auth_type, 
        oauth_credentials
      ) 
      VALUES (?, ?, ?, ?, ?, ?) 
      RETURNING *
    `,
    args: [
      id,
      config.email,
      encryptedPassword,
      config.isDefault ? 1 : 0,
      config.authType,
      encryptedOAuthCredentials
    ]
  });
  
  return {
    id: String(rows[0].id),
    email: String(rows[0].email),
    password: config.password,
    isDefault: Boolean(rows[0].is_default),
    authType: config.authType,
    oauthCredentials: config.oauthCredentials
  };
}

export async function updateEmailConfig(
  id: string,
  config: {
    email?: string;
    password?: string;
    isDefault?: boolean;
    oauthCredentials?: OAuthCredentials;
    templateId?: string;
  }
): Promise<void> {
  try {
    const updates: string[] = [];
    const args: any[] = [];

    if (config.email !== undefined) {
      updates.push('email = ?');
      args.push(config.email);
    }
    if (config.password !== undefined) {
      updates.push('password = ?');
      args.push(encryptPassword(config.password));
    }
    if (config.isDefault !== undefined) {
      updates.push('is_default = ?');
      args.push(config.isDefault ? 1 : 0);
    }
    if (config.oauthCredentials !== undefined) {
      updates.push('oauth_credentials = ?');
      args.push(encryptPassword(JSON.stringify(config.oauthCredentials)));
    }
    if (config.templateId !== undefined) {
      updates.push('template_id = ?');
      args.push(config.templateId || null);
    }

    if (updates.length === 0) return;

    args.push(id);

    // Si esta cuenta será la predeterminada, actualizar las demás
    if (config.isDefault) {
      await db.execute(`UPDATE email_configs SET is_default = 0 WHERE id <> '${id}'`);
    }

    await db.execute({
      sql: `UPDATE email_configs SET ${updates.join(', ')} WHERE id = ?`,
      args
    });
  } catch (error) {
    console.error('Error updating email config:', error);
    throw error;
  }
}

export async function deleteEmailConfig(id: string) {
  await db.execute({
    sql: 'DELETE FROM email_configs WHERE id = ?',
    args: [id]
  });
}

// Email Templates
export async function getEmailTemplates(): Promise<EmailTemplate[]> {
  const { rows } = await db.execute(
    'SELECT * FROM email_templates ORDER BY is_default DESC'
  );
  return rows.map(row => ({
    id: String(row.id),
    name: String(row.name),
    subject: String(row.subject),
    body: String(row.body),
    isDefault: Boolean(row.is_default)
  }));
}

export async function saveEmailTemplate(template: Omit<EmailTemplate, 'id'>): Promise<EmailTemplate> {
  const id = crypto.randomUUID();
  const { rows } = await db.execute({
    sql: 'INSERT INTO email_templates (id, name, subject, body, is_default) VALUES (?, ?, ?, ?, ?) RETURNING *',
    args: [id, template.name, template.subject, template.body, template.isDefault ? 1 : 0]
  });
  return {
    id: String(rows[0].id),
    name: String(rows[0].name),
    subject: String(rows[0].subject),
    body: String(rows[0].body),
    isDefault: Boolean(rows[0].is_default)
  };
}

export async function updateEmailTemplate(id: string, template: { name?: string; subject?: string; body?: string; isDefault?: boolean }) {
  const updates = [];
  const args = [];
  
  if (template.name !== undefined) {
    updates.push('name = ?');
    args.push(template.name);
  }
  if (template.subject !== undefined) {
    updates.push('subject = ?');
    args.push(template.subject);
  }
  if (template.body !== undefined) {
    updates.push('body = ?');
    args.push(template.body);
  }
  if (template.isDefault !== undefined) {
    updates.push('is_default = ?');
    args.push(template.isDefault ? 1 : 0);
  }

  if (updates.length === 0) return;

  args.push(id);

  await db.execute({
    sql: `UPDATE email_templates SET ${updates.join(', ')} WHERE id = ?`,
    args
  });

  if (template.isDefault) {
    // Si esta plantilla se establece como predeterminada, actualizar las demás
    await db.execute({
      sql: 'UPDATE email_templates SET is_default = 0 WHERE id != ?',
      args: [id]
    });
  }
}

export async function deleteEmailTemplate(id: string) {
  try {
    // Primero, eliminar las referencias en email_configs
    await db.execute({
      sql: 'UPDATE email_configs SET template_id = NULL WHERE template_id = ?',
      args: [id]
    });

    // Luego, eliminar la plantilla
    await db.execute({
      sql: 'DELETE FROM email_templates WHERE id = ?',
      args: [id]
    });
  } catch (error) {
    console.error('Error al eliminar la plantilla:', error);
    throw error;
  }
}

export async function getOAuthConfig() {
  const result = await db.execute('SELECT * FROM oauth_config WHERE is_active = true LIMIT 1');
  
  if (result.rows.length === 0) return null;
  
  const row = result.rows[0];
  return {
    id: row.id as string,
    clientId: row.client_id as string,
    clientSecret: decryptPassword(row.client_secret as string),
    redirectUri: row.redirect_uri as string,
    isActive: Boolean(row.is_active)
  };
}

export async function saveOAuthConfig(config: {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}) {
  const id = crypto.randomUUID();
  const encryptedSecret = encryptPassword(config.clientSecret);

  // Desactivar cualquier configuración activa existente
  await db.execute('UPDATE oauth_config SET is_active = false');

  // Insertar la nueva configuración
  await db.execute({
    sql: `
      INSERT INTO oauth_config (id, client_id, client_secret, redirect_uri, is_active)
      VALUES (?, ?, ?, ?, true)
    `,
    args: [id, config.clientId, encryptedSecret, config.redirectUri]
  });

  return {
    id,
    ...config,
    isActive: true
  };
}

export async function updateOAuthConfig(
  id: string,
  config: {
    clientId?: string;
    clientSecret?: string;
    redirectUri?: string;
    isActive?: boolean;
  }
) {
  const updates: string[] = [];
  const args: any[] = [];

  if (config.clientId !== undefined) {
    updates.push('client_id = ?');
    args.push(config.clientId);
  }
  if (config.clientSecret !== undefined) {
    updates.push('client_secret = ?');
    args.push(encryptPassword(config.clientSecret));
  }
  if (config.redirectUri !== undefined) {
    updates.push('redirect_uri = ?');
    args.push(config.redirectUri);
  }
  if (config.isActive !== undefined) {
    if (config.isActive) {
      await db.execute('UPDATE oauth_config SET is_active = false');
    }
    updates.push('is_active = ?');
    args.push(config.isActive);
  }

  if (updates.length > 0) {
    args.push(id);
    await db.execute({
      sql: `UPDATE oauth_config SET ${updates.join(', ')} WHERE id = ?`,
      args
    });
  }
} 
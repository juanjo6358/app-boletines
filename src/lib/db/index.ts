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
  EvaluationCriterion
} from '../../types';

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
  const result = await db.execute({
    sql: `
      INSERT INTO students (
        first_name,
        last_name,
        email,
        address, 
        identifier, 
        instrument_id, 
        level_id, 
        course_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?) 
      RETURNING id
    `,
    args: [
      student.firstName,
      student.lastName,
      student.email,
      student.address || null,  // Permitir null para dirección
      student.identifier,
      student.instrumentId,
      student.levelId,
      student.courseId
    ]
  });

  // Obtener el estudiante recién creado con todos sus datos
  const newStudentId = result.rows[0].id as string;
  const studentResult = await db.execute({
    sql: `
      SELECT s.*, i.name as instrument_name, l.name as level_name, c.name as course_name
      FROM students s
      JOIN instruments i ON s.instrument_id = i.id
      JOIN levels l ON s.level_id = l.id
      JOIN courses c ON s.course_id = c.id
      WHERE s.id = ?
    `,
    args: [newStudentId]
  });

  const row = studentResult.rows[0];
  return {
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
  };
}

export async function updateStudent(id: string, student: Omit<Student, 'id'>): Promise<Student> {
  await db.execute({
    sql: `
      UPDATE students 
      SET first_name = ?,
          last_name = ?,
          email = ?,
          address = ?,
          identifier = ?,
          instrument_id = ?,
          level_id = ?,
          course_id = ?
      WHERE id = ?
    `,
    args: [
      student.firstName,
      student.lastName,
      student.email,
      student.address || null,
      student.identifier,
      student.instrumentId,
      student.levelId,
      student.courseId,
      id
    ]
  });

  // Obtener el estudiante actualizado
  const result = await db.execute({
    sql: `
      SELECT s.*, i.name as instrument_name, l.name as level_name, c.name as course_name
      FROM students s
      JOIN instruments i ON s.instrument_id = i.id
      JOIN levels l ON s.level_id = l.id
      JOIN courses c ON s.course_id = c.id
      WHERE s.id = ?
    `,
    args: [id]
  });

  const row = result.rows[0];
  return {
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
  teacher: Omit<Teacher, 'id' | 'instrumentName'>,
  courseIds: string[]
): Promise<Teacher> {
  const id = crypto.randomUUID();
  
  // Primero verificamos que el instrumento existe
  const instrumentExists = await db.execute({
    sql: 'SELECT id FROM instruments WHERE id = ?',
    args: [teacher.instrumentId]
  });

  if (!instrumentExists.rows.length) {
    throw new Error('El instrumento seleccionado no existe');
  }

  // Verificamos que todos los cursos existen
  for (const courseId of courseIds) {
    const courseExists = await db.execute({
      sql: 'SELECT id FROM courses WHERE id = ?',
      args: [courseId]
    });
    if (!courseExists.rows.length) {
      throw new Error(`El curso ${courseId} no existe`);
    }
  }

  // Verificar que los campos requeridos no son undefined
  if (!teacher.password || !teacher.username || !teacher.email || !teacher.identifier) {
    throw new Error('Faltan campos requeridos');
  }

  try {
    // Usar execute directamente en lugar de transaction
    await db.execute({
      sql: `
        INSERT INTO teachers (
          id, first_name, last_name, identifier, email, 
          username, password, instrument_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        id,
        teacher.firstName,
        teacher.lastName,
        teacher.identifier,
        teacher.email,
        teacher.username,
        teacher.password,
        teacher.instrumentId
      ]
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
    console.error('Error creating teacher:', error);
    throw new Error('Error al crear el profesor');
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
  teacher: Partial<Omit<Teacher, 'id' | 'instrumentName'>>, 
  courseIds: string[]
): Promise<void> {
  const updates: string[] = [];
  const args: any[] = [];

  if (teacher.firstName) {
    updates.push('first_name = ?');
    args.push(teacher.firstName);
  }
  if (teacher.lastName) {
    updates.push('last_name = ?');
    args.push(teacher.lastName);
  }
  if (teacher.identifier) {
    updates.push('identifier = ?');
    args.push(teacher.identifier);
  }
  if (teacher.email) {
    updates.push('email = ?');
    args.push(teacher.email);
  }
  if (teacher.username) {
    updates.push('username = ?');
    args.push(teacher.username);
  }
  if (teacher.password) {
    updates.push('password = ?');
    args.push(teacher.password);
  }
  if (teacher.instrumentId) {
    updates.push('instrument_id = ?');
    args.push(teacher.instrumentId);
  }

  try {
    // Actualizar datos del profesor
    if (updates.length > 0) {
      args.push(id);
      await db.execute({
        sql: `UPDATE teachers SET ${updates.join(', ')} WHERE id = ?`,
        args
      });
    }

    // Actualizar cursos asignados
    // Primero eliminamos todas las asignaciones existentes
    await db.execute({
      sql: 'DELETE FROM teacher_courses WHERE teacher_id = ?',
      args: [id],
    });

    // Luego insertamos las nuevas asignaciones
    if (courseIds.length > 0) {
      const values = courseIds.map(courseId => 
        `('${id}', '${courseId}')`
      ).join(',');
      
      await db.execute(`
        INSERT INTO teacher_courses (teacher_id, course_id)
        VALUES ${values}
      `);
    }
  } catch (error) {
    console.error('Error updating teacher:', error);
    throw new Error('Error al actualizar el profesor');
  }
}

export async function deleteTeacher(id: string): Promise<void> {
  await db.execute({
    sql: 'DELETE FROM teacher_courses WHERE teacher_id = ?',
    args: [id],
  });
  
  await db.execute({
    sql: 'DELETE FROM teachers WHERE id = ?',
    args: [id],
  });
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
      const values = template.subjects.map(subject =>
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
    const values = template.subjects.map(subject => 
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
  const result = await db.execute({
    sql: `
      SELECT * FROM teacher_course_subjects
      WHERE teacher_id = ?
    `,
    args: [teacherId]
  });

  return result.rows.map(row => ({
    id: row.id as string,
    teacherId: row.teacher_id as string,
    courseId: row.course_id as string,
    subjectName: row.subject_name as string,
    subjectType: row.subject_type as 'individual' | 'group'
  }));
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
    const sectionsWithFields = reportCard.sections.map(section => ({
      ...section,
      fields: section.fields.map(field => ({
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
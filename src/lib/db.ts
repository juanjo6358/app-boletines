export * from './db/index';
export * from './db/types';
import { db } from './db/index';

// Definir los tipos necesarios aquí
interface GradeData {
  attendance: string;
  global: string;
  criteria: { [fieldId: string]: string };
  observations?: string;
}

interface Grades {
  [sectionId: string]: GradeData;
}

interface Field {
  id: string;
  name: string;
  type: string;
  isAdditional?: boolean;
}

interface AdditionalCriterion {
  sectionId: string;
  fields: Field[];
}

interface SaveStudentGradesParams {
  studentId: string;
  courseId: string;
  templateId: string;
  academicYear: string;
  grades: Grades;
  additionalCriteria: AdditionalCriterion[];
}

// Función para obtener las notas del estudiante
async function getStudentGrades(studentId: string, courseId: string) {
  const result = await db.execute({
    sql: `SELECT * FROM student_grades WHERE student_id = ? AND course_id = ?`,
    args: [studentId, courseId]
  });

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  console.log('Datos crudos de la BD:', {
    id: row.id,
    additionalCriteria: row.additional_criteria
  });

  let additionalCriteria = [];
  try {
    if (row.additional_criteria) {
      additionalCriteria = JSON.parse(row.additional_criteria as string);
      console.log('Criterios adicionales parseados:', additionalCriteria);
    }
  } catch (error) {
    console.error('Error parseando criterios adicionales:', error);
  }

  return {
    id: row.id as string,
    studentId: row.student_id as string,
    courseId: row.course_id as string,
    templateId: row.template_id as string,
    academicYear: row.academic_year as string,
    grades: JSON.parse(row.grades as string),
    additionalCriteria
  };
}

export const saveStudentGrades = async ({
  studentId,
  courseId,
  templateId,
  academicYear,
  grades,
  additionalCriteria
}: SaveStudentGradesParams) => {
  console.log('Inicio saveStudentGrades con:', {
    studentId,
    courseId,
    additionalCriteria: JSON.stringify(additionalCriteria, null, 2)
  });

  try {
    const existingRecord = await db.execute({
      sql: 'SELECT id, additional_criteria FROM student_grades WHERE student_id = ? AND course_id = ?',
      args: [studentId, courseId]
    });

    console.log('Registro existente:', {
      exists: existingRecord.rows.length > 0,
      currentAdditionalCriteria: existingRecord.rows[0]?.additional_criteria
    });

    const gradesJson = JSON.stringify(grades);
    const criteriaJson = JSON.stringify(additionalCriteria || []);

    console.log('Datos a guardar:', {
      gradesJson: gradesJson.substring(0, 100) + '...',
      criteriaJson
    });

    if (existingRecord.rows.length > 0) {
      // Actualizar registro existente
      await db.execute({
        sql: `
          UPDATE student_grades 
          SET grades = ?, 
              template_id = ?,
              academic_year = ?,
              additional_criteria = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE student_id = ? AND course_id = ?
        `,
        args: [
          gradesJson,
          templateId,
          academicYear,
          criteriaJson,
          studentId,
          courseId
        ]
      });
      console.log('Registro actualizado');
    } else {
      // Insertar nuevo registro
      const id = crypto.randomUUID();
      await db.execute({
        sql: `
          INSERT INTO student_grades (
            id, student_id, course_id, template_id, academic_year, grades, additional_criteria
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          id,
          studentId,
          courseId,
          templateId,
          academicYear,
          gradesJson,
          criteriaJson
        ]
      });
      console.log('Nuevo registro insertado');
    }

    // Verificar después de guardar
    const savedData = await getStudentGrades(studentId, courseId);
    console.log('Datos guardados:', {
      savedGrades: Object.keys(savedData?.grades || {}),
      savedCriteria: savedData?.additionalCriteria,
      rawCriteria: savedData?.additionalCriteria
    });

  } catch (error) {
    console.error('Error guardando notas:', error);
    throw error;
  }
};

// Exportar también getStudentGrades para que esté disponible
export { getStudentGrades };
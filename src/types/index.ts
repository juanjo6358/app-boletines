export interface Instrument {
  id: string;
  name: string;
}

export interface Level {
  id: string;
  name: string;
}

export interface Student {
  id: string;
  firstName: string;  // Nombre
  lastName: string;   // Apellidos
  address?: string;   // Ahora opcional
  email: string;      // Nuevo campo obligatorio
  identifier: string;
  instrumentId: string;
  levelId: string;
  courseId: string;
  instrumentName?: string;
  levelName?: string;
  courseName?: string;
}

export interface Course {
  id: string;
  name: string;
  levelId: string;
  levelName?: string;
  academicYear: string;
  templateId?: string;
}

export interface AcademicYear {
  id: string;
  name: string;    // Ejemplo: "2023-2024"
  isActive: boolean;
}

export interface GroupSubject {
  id: string;
  name: string;
}

export interface TeacherCourseSubject {
  id: string;
  teacherId: string;
  courseId: string;
  subjectName: string;
  subjectType: 'individual' | 'group';
}

export interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
  identifier: string;
  email: string;
  username: string;
  password?: string;
  instrumentId: string;
  instrumentName?: string;
  courseIds: string[];
  courseNames?: string[];
  courseSubjects?: {
    [courseId: string]: {
      name: string;
      type: 'individual' | 'group';
    }[];
  };
}

export interface CourseTemplate {
  id: string;
  name: string;
  levelId: string;
  courseId: string;
  academicYear: string;
  levelName?: string;
  subjects: CourseTemplateSubject[];
}

export interface CourseTemplateSubject {
  id: string;
  name: string;
  type: 'individual' | 'group';
  isRequired: boolean;
}

export interface Field {
  id: string;
  name: string;
  type: 'text' | 'number' | 'select' | 'date' | 'signature';
  options?: string[]; // Para campos select
  isAdditional?: boolean; // Añadir esta propiedad
}

export interface Section {
  id: string;
  title: string;
  type: 'grades' | 'observations' | 'header' | 'signatures';
  fields: Field[];
  hasObservations?: boolean;
  data?: {
    logo?: string;  // Para almacenar la imagen en base64
    centerName?: string;
    location?: string;
    academicYear?: string;
    content?: string; // Para el contenido del editor de texto enriquecido
  };
}

export interface ReportCardState {
  id: string;
  courseId: string;
  sections: Section[];
  subjects: CourseTemplateSubject[];
}

export interface CriteriaGroup {
  id: string;
  name: string;
  criteria: Field[];
}

export interface EvaluationCriterion {
  id: string;
  label: string;
  value: string;
  order: number;
  isDefault?: boolean;
}

export interface GradeData {
  attendance: string;
  global: string;
  criteria: { [fieldId: string]: string };
  observations?: string;
}

export interface Grades {
  [sectionId: string]: GradeData;
}

export interface AdditionalCriterion {
  sectionId: string;
  fields: Field[];
} 
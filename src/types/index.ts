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
  identifier: string;
  email: string | null;
  phone?: string | null; // Añadir propiedad phone
  address?: string | null;
  birthDate?: string | null;
  courseId: string;
  courseName?: string;
  instrumentId: string;
  instrumentName?: string;
  levelName?: string;
  teacherName?: string;     // Nueva propiedad
}

export interface Course {
  id: string;
  name: string;
  levelId: string;
  levelName?: string;
  academicYear: string;
  templateId?: string;
}

export interface CourseWithLevel extends Course {
  levelName: string;
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

export type Permission = 
  | 'view_students'
  | 'edit_students'
  | 'view_courses'
  | 'edit_courses'
  | 'view_grades'
  | 'edit_grades'
  | 'view_report_cards'
  | 'edit_report_cards'
  | 'view_teachers'
  | 'edit_teachers'
  | 'view_teacher_subjects'
  | 'edit_teacher_subjects';

export interface UserPermissions {
  [key: string]: Permission[];
}

export interface User {
  id: string;
  username: string;
  password?: string;
  role: 'admin' | 'teacher';
  email: string;
  isActive: boolean;
  teacherId?: string;
  permissions?: Permission[];
}

export interface CenterConfig {
  name: string;
  logo?: string;
  directorName?: string;   // Nueva propiedad
}

export interface OAuthCredentials {
  accessToken: string;
  refreshToken: string;
  expiryDate: number;
}

export interface EmailConfig {
  id: string;
  email: string;
  password?: string;
  isDefault: boolean;
  authType: 'password' | 'oauth';
  oauthCredentials?: OAuthCredentials;
}

export * from './email'; 
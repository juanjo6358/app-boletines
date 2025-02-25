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
  firstName: string;
  lastName: string;
  identifier: string;
  email: string | null;
  phone?: string | null;
  address?: string | null;
  birthDate?: string | null;
  courseId: string;
  courseName?: string;
  instrumentId: string;
  instrumentName?: string;
  levelName?: string;
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
  name: string;
  isActive: boolean;
}

export interface GroupSubject {
  id: string;
  name: string;
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

export interface TeacherCourseSubject {
  id: string;
  teacherId: string;
  courseId: string;
  subjectName: string;
  subjectType: 'individual' | 'group';
}

export interface ReportCardState {
  id: string;
  courseId: string;
  sections: Section[];
  subjects: CourseTemplateSubject[];
}

export interface Section {
  id: string;
  title: string;
  type: 'grades' | 'observations' | 'header' | 'signatures';
  fields: Field[];
  hasObservations?: boolean;
  data?: {
    logo?: string;
    centerName?: string;
    location?: string;
    academicYear?: string;
    content?: string;
  };
}

export interface Field {
  id: string;
  name: string;
  type: 'text' | 'number' | 'select' | 'date' | 'signature';
  options?: string[];
  isAdditional?: boolean;
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

// ... (resto de tipos) 
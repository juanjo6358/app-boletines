export type Role = 'admin' | 'teacher' | 'student';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  created_at: string;
}

export interface Course {
  id: string;
  name: string;
  academic_year: string;
  template_id: string;
  created_at: string;
}

export interface Student {
  id: string;
  name: string;
  course_id: string;
  teacher_id: string;
  created_at: string;
}

export interface ReportCard {
  id: string;
  student_id: string;
  course_id: string;
  period: string;
  data: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Template {
  id: string;
  name: string;
  schema: Record<string, any>;
  created_at: string;
} 


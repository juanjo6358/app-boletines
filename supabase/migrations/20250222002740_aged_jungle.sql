/*
  # Initial Schema Setup for Music School Management System

  1. Tables
    - users: Store user accounts (admins, teachers, students)
    - courses: Academic courses
    - students: Student information and course enrollment
    - report_cards: Student evaluations and grades
    - templates: Report card templates
    - course_templates: Link courses to their report card templates

  2. Security
    - Enable RLS on all tables
    - Add policies for role-based access
*/

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'teacher', 'student')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT valid_email CHECK (email LIKE '%@%')
);

-- Courses table
CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  academic_year TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Students table
CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  course_id TEXT NOT NULL REFERENCES courses(id),
  teacher_id TEXT NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Templates table
CREATE TABLE IF NOT EXISTS templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  schema JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Report Cards table
CREATE TABLE IF NOT EXISTS report_cards (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id),
  course_id TEXT NOT NULL REFERENCES courses(id),
  period TEXT NOT NULL,
  data JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Course Templates table
CREATE TABLE IF NOT EXISTS course_templates (
  course_id TEXT NOT NULL REFERENCES courses(id),
  template_id TEXT NOT NULL REFERENCES templates(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (course_id, template_id)
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can read their own data
CREATE POLICY users_read ON users
  FOR SELECT
  USING (auth.role() = 'admin' OR auth.uid() = id);

-- Only admins can modify users
CREATE POLICY users_modify ON users
  FOR ALL
  USING (auth.role() = 'admin');

-- Teachers can read their assigned students
CREATE POLICY students_read ON students
  FOR SELECT
  USING (
    auth.role() = 'admin' OR
    (auth.role() = 'teacher' AND teacher_id = auth.uid()) OR
    (auth.role() = 'student' AND id = auth.uid())
  );

-- Only admins can modify students
CREATE POLICY students_modify ON students
  FOR ALL
  USING (auth.role() = 'admin');

-- Teachers can read and update report cards for their students
CREATE POLICY report_cards_read ON report_cards
  FOR SELECT
  USING (
    auth.role() = 'admin' OR
    EXISTS (
      SELECT 1 FROM students
      WHERE students.id = report_cards.student_id
      AND students.teacher_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM students
      WHERE students.id = report_cards.student_id
      AND students.id = auth.uid()
    )
  );

CREATE POLICY report_cards_update ON report_cards
  FOR UPDATE
  USING (
    auth.role() = 'admin' OR
    EXISTS (
      SELECT 1 FROM students
      WHERE students.id = report_cards.student_id
      AND students.teacher_id = auth.uid()
    )
  );
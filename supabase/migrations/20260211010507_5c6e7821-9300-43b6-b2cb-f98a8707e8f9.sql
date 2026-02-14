
-- Create attendance_status enum
CREATE TYPE public.attendance_status AS ENUM ('present', 'absent', 'late', 'excused');

-- Classes table
CREATE TABLE public.classes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  section TEXT,
  grade_level TEXT,
  academic_year TEXT NOT NULL DEFAULT '2025-2026',
  class_teacher_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Subjects table
CREATE TABLE public.subjects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Class-Subject mapping with teacher
CREATE TABLE public.class_subjects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  teacher_id UUID,
  UNIQUE(class_id, subject_id)
);

-- Student enrollment in classes
CREATE TABLE public.student_classes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  academic_year TEXT NOT NULL DEFAULT '2025-2026',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id, class_id, academic_year)
);

-- Attendance records
CREATE TABLE public.attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status attendance_status NOT NULL DEFAULT 'present',
  marked_by UUID,
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id, class_id, date)
);

-- Timetable slots
CREATE TABLE public.timetable_slots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  teacher_id UUID,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  room TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_attendance_student_date ON public.attendance(student_id, date);
CREATE INDEX idx_attendance_class_date ON public.attendance(class_id, date);
CREATE INDEX idx_student_classes_student ON public.student_classes(student_id);
CREATE INDEX idx_student_classes_class ON public.student_classes(class_id);
CREATE INDEX idx_timetable_class ON public.timetable_slots(class_id);
CREATE INDEX idx_timetable_teacher ON public.timetable_slots(teacher_id);

-- Enable RLS on all tables
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_slots ENABLE ROW LEVEL SECURITY;

-- CLASSES RLS
CREATE POLICY "Admin full access to classes" ON public.classes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Teachers can view assigned classes" ON public.classes FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'teacher') AND class_teacher_id = auth.uid());
CREATE POLICY "Students can view enrolled classes" ON public.classes FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'student') AND id IN (SELECT class_id FROM public.student_classes WHERE student_id = auth.uid()));

-- SUBJECTS RLS
CREATE POLICY "Admin full access to subjects" ON public.subjects FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated users can view subjects" ON public.subjects FOR SELECT TO authenticated
  USING (true);

-- CLASS_SUBJECTS RLS
CREATE POLICY "Admin full access to class_subjects" ON public.class_subjects FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Teachers can view their class_subjects" ON public.class_subjects FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'teacher') AND teacher_id = auth.uid());
CREATE POLICY "Students can view their class subjects" ON public.class_subjects FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'student') AND class_id IN (SELECT class_id FROM public.student_classes WHERE student_id = auth.uid()));

-- STUDENT_CLASSES RLS
CREATE POLICY "Admin full access to student_classes" ON public.student_classes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Teachers can view students in their classes" ON public.student_classes FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'teacher') AND class_id IN (SELECT id FROM public.classes WHERE class_teacher_id = auth.uid()));
CREATE POLICY "Students can view own enrollment" ON public.student_classes FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'student') AND student_id = auth.uid());

-- ATTENDANCE RLS
CREATE POLICY "Admin full access to attendance" ON public.attendance FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Teachers can manage attendance for their classes" ON public.attendance FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'teacher') AND class_id IN (SELECT id FROM public.classes WHERE class_teacher_id = auth.uid()));
CREATE POLICY "Students can view own attendance" ON public.attendance FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'student') AND student_id = auth.uid());

-- TIMETABLE_SLOTS RLS
CREATE POLICY "Admin full access to timetable" ON public.timetable_slots FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Teachers can view their timetable" ON public.timetable_slots FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'teacher') AND teacher_id = auth.uid());
CREATE POLICY "Students can view their class timetable" ON public.timetable_slots FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'student') AND class_id IN (SELECT class_id FROM public.student_classes WHERE student_id = auth.uid()));

-- Updated_at triggers
CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON public.classes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

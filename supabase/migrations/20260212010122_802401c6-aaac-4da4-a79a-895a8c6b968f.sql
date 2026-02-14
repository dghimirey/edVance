
-- ============================================
-- Phase 3: Exams, Marks, Grading, Report Cards
-- ============================================

-- 1. exams table
CREATE TABLE public.exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  exam_type text NOT NULL DEFAULT 'midterm',
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  academic_year text NOT NULL DEFAULT '2025-2026',
  start_date date,
  end_date date,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access to exams" ON public.exams FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Teachers can view exams for their classes" ON public.exams FOR SELECT
  USING (has_role(auth.uid(), 'teacher'::app_role) AND class_id IN (
    SELECT id FROM public.classes WHERE class_teacher_id = auth.uid()
  ));

CREATE POLICY "Students can view exams for their class" ON public.exams FOR SELECT
  USING (has_role(auth.uid(), 'student'::app_role) AND class_id IN (
    SELECT class_id FROM public.student_classes WHERE student_id = auth.uid()
  ));

CREATE INDEX idx_exams_class_id ON public.exams(class_id);

-- 2. exam_subjects table
CREATE TABLE public.exam_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  max_marks integer NOT NULL DEFAULT 100,
  passing_marks integer NOT NULL DEFAULT 35,
  exam_date date
);

ALTER TABLE public.exam_subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access to exam_subjects" ON public.exam_subjects FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Teachers can view exam_subjects for their exams" ON public.exam_subjects FOR SELECT
  USING (has_role(auth.uid(), 'teacher'::app_role) AND exam_id IN (
    SELECT id FROM public.exams WHERE class_id IN (
      SELECT id FROM public.classes WHERE class_teacher_id = auth.uid()
    )
  ));

CREATE POLICY "Students can view exam_subjects" ON public.exam_subjects FOR SELECT
  USING (has_role(auth.uid(), 'student'::app_role) AND exam_id IN (
    SELECT id FROM public.exams WHERE class_id IN (
      SELECT class_id FROM public.student_classes WHERE student_id = auth.uid()
    )
  ));

CREATE INDEX idx_exam_subjects_exam_id ON public.exam_subjects(exam_id);

-- 3. student_marks table
CREATE TABLE public.student_marks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_subject_id uuid NOT NULL REFERENCES public.exam_subjects(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  marks_obtained numeric,
  remarks text,
  entered_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(exam_subject_id, student_id)
);

ALTER TABLE public.student_marks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access to student_marks" ON public.student_marks FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Teachers can manage marks for their class students" ON public.student_marks FOR ALL
  USING (has_role(auth.uid(), 'teacher'::app_role) AND exam_subject_id IN (
    SELECT es.id FROM public.exam_subjects es
    JOIN public.exams e ON es.exam_id = e.id
    JOIN public.classes c ON e.class_id = c.id
    WHERE c.class_teacher_id = auth.uid()
  ));

CREATE POLICY "Students can view own marks" ON public.student_marks FOR SELECT
  USING (has_role(auth.uid(), 'student'::app_role) AND student_id = auth.uid());

CREATE INDEX idx_student_marks_exam_subject ON public.student_marks(exam_subject_id);
CREATE INDEX idx_student_marks_student ON public.student_marks(student_id);

CREATE TRIGGER update_student_marks_updated_at
  BEFORE UPDATE ON public.student_marks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. grading_scales table
CREATE TABLE public.grading_scales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  academic_year text NOT NULL DEFAULT '2025-2026',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.grading_scales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access to grading_scales" ON public.grading_scales FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view grading_scales" ON public.grading_scales FOR SELECT
  USING (true);

-- 5. grading_scale_entries table
CREATE TABLE public.grading_scale_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scale_id uuid NOT NULL REFERENCES public.grading_scales(id) ON DELETE CASCADE,
  grade text NOT NULL,
  min_percentage numeric NOT NULL,
  max_percentage numeric NOT NULL,
  grade_point numeric
);

ALTER TABLE public.grading_scale_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access to grading_scale_entries" ON public.grading_scale_entries FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view grading_scale_entries" ON public.grading_scale_entries FOR SELECT
  USING (true);

CREATE INDEX idx_grading_scale_entries_scale ON public.grading_scale_entries(scale_id);

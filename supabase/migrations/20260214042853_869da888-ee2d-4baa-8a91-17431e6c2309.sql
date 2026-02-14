
-- 1. Create SECURITY DEFINER helper functions to break RLS recursion
CREATE OR REPLACE FUNCTION public.get_teacher_class_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.classes WHERE class_teacher_id = _user_id
$$;

CREATE OR REPLACE FUNCTION public.get_student_class_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT class_id FROM public.student_classes WHERE student_id = _user_id
$$;

-- 2. Drop all recursive policies on classes
DROP POLICY IF EXISTS "Students can view enrolled classes" ON public.classes;
DROP POLICY IF EXISTS "Teachers can view assigned classes" ON public.classes;

-- Recreate without recursion
CREATE POLICY "Teachers can view assigned classes"
ON public.classes FOR SELECT
USING (has_role(auth.uid(), 'teacher') AND class_teacher_id = auth.uid());

CREATE POLICY "Students can view enrolled classes"
ON public.classes FOR SELECT
USING (has_role(auth.uid(), 'student') AND id IN (SELECT get_student_class_ids(auth.uid())));

-- 3. Fix student_classes policies
DROP POLICY IF EXISTS "Teachers can view students in their classes" ON public.student_classes;

CREATE POLICY "Teachers can view students in their classes"
ON public.student_classes FOR SELECT
USING (has_role(auth.uid(), 'teacher') AND class_id IN (SELECT get_teacher_class_ids(auth.uid())));

-- 4. Fix attendance policies
DROP POLICY IF EXISTS "Teachers can manage attendance for their classes" ON public.attendance;

CREATE POLICY "Teachers can manage attendance for their classes"
ON public.attendance FOR ALL
USING (has_role(auth.uid(), 'teacher') AND class_id IN (SELECT get_teacher_class_ids(auth.uid())));

-- 5. Fix exams policies
DROP POLICY IF EXISTS "Teachers can view exams for their classes" ON public.exams;

CREATE POLICY "Teachers can view exams for their classes"
ON public.exams FOR SELECT
USING (has_role(auth.uid(), 'teacher') AND class_id IN (SELECT get_teacher_class_ids(auth.uid())));

DROP POLICY IF EXISTS "Students can view exams for their class" ON public.exams;

CREATE POLICY "Students can view exams for their class"
ON public.exams FOR SELECT
USING (has_role(auth.uid(), 'student') AND class_id IN (SELECT get_student_class_ids(auth.uid())));

-- 6. Fix exam_subjects policies
DROP POLICY IF EXISTS "Teachers can view exam_subjects for their exams" ON public.exam_subjects;
DROP POLICY IF EXISTS "Students can view exam_subjects" ON public.exam_subjects;

CREATE POLICY "Teachers can view exam_subjects for their exams"
ON public.exam_subjects FOR SELECT
USING (has_role(auth.uid(), 'teacher') AND exam_id IN (
  SELECT id FROM public.exams WHERE class_id IN (SELECT get_teacher_class_ids(auth.uid()))
));

CREATE POLICY "Students can view exam_subjects"
ON public.exam_subjects FOR SELECT
USING (has_role(auth.uid(), 'student') AND exam_id IN (
  SELECT id FROM public.exams WHERE class_id IN (SELECT get_student_class_ids(auth.uid()))
));

-- 7. Fix student_marks policies
DROP POLICY IF EXISTS "Teachers can manage marks for their class students" ON public.student_marks;

CREATE POLICY "Teachers can manage marks for their class students"
ON public.student_marks FOR ALL
USING (has_role(auth.uid(), 'teacher') AND exam_subject_id IN (
  SELECT es.id FROM public.exam_subjects es
  JOIN public.exams e ON es.exam_id = e.id
  WHERE e.class_id IN (SELECT get_teacher_class_ids(auth.uid()))
));

-- 8. Fix timetable_slots policies
DROP POLICY IF EXISTS "Students can view their class timetable" ON public.timetable_slots;

CREATE POLICY "Students can view their class timetable"
ON public.timetable_slots FOR SELECT
USING (has_role(auth.uid(), 'student') AND class_id IN (SELECT get_student_class_ids(auth.uid())));

-- 9. Fix class_subjects policies
DROP POLICY IF EXISTS "Students can view their class subjects" ON public.class_subjects;

CREATE POLICY "Students can view their class subjects"
ON public.class_subjects FOR SELECT
USING (has_role(auth.uid(), 'student') AND class_id IN (SELECT get_student_class_ids(auth.uid())));

-- 10. Create school_settings table
CREATE TABLE IF NOT EXISTS public.school_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_name text NOT NULL DEFAULT 'My School',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.school_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access to school_settings"
ON public.school_settings FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can read school_settings"
ON public.school_settings FOR SELECT
USING (true);

-- Seed default row
INSERT INTO public.school_settings (school_name) VALUES ('edVance School');

import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface StudentMark {
  student_id: string;
  full_name: string;
  marks_obtained: string;
  remarks: string;
  existing_id?: string;
}

const MarksEntry = () => {
  const { examId, subjectId } = useParams<{ examId: string; subjectId: string }>();
  const { user } = useAuth();
  const [examSubject, setExamSubject] = useState<any>(null);
  const [exam, setExam] = useState<any>(null);
  const [students, setStudents] = useState<StudentMark[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      // Fetch exam_subject info
      const { data: es } = await supabase
        .from("exam_subjects")
        .select("*, subjects(name, code)")
        .eq("id", subjectId!)
        .single();
      setExamSubject(es);

      if (!es) { setLoading(false); return; }

      // Fetch exam
      const { data: examData } = await supabase.from("exams").select("*, classes(name)").eq("id", examId!).single();
      setExam(examData);

      if (!examData) { setLoading(false); return; }

      // Fetch enrolled students
      const { data: enrollments } = await supabase
        .from("student_classes")
        .select("student_id")
        .eq("class_id", examData.class_id);

      const studentIds = (enrollments || []).map((e: any) => e.student_id);
      if (studentIds.length === 0) { setStudents([]); setLoading(false); return; }

      // Fetch profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", studentIds);

      // Fetch existing marks
      const { data: existingMarks } = await supabase
        .from("student_marks")
        .select("*")
        .eq("exam_subject_id", subjectId!)
        .in("student_id", studentIds);

      const marksMap = Object.fromEntries((existingMarks || []).map((m: any) => [m.student_id, m]));
      const profileMap = Object.fromEntries((profiles || []).map((p: any) => [p.user_id, p.full_name]));

      setStudents(studentIds.map(sid => ({
        student_id: sid,
        full_name: profileMap[sid] || "Unknown",
        marks_obtained: marksMap[sid]?.marks_obtained?.toString() ?? "",
        remarks: marksMap[sid]?.remarks ?? "",
        existing_id: marksMap[sid]?.id,
      })));

      setLoading(false);
    };
    load();
  }, [examId, subjectId]);

  const updateMark = (idx: number, field: "marks_obtained" | "remarks", value: string) => {
    setStudents(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };

  const handleSave = async () => {
    if (!examSubject) return;
    const maxMarks = examSubject.max_marks;

    // Validate
    for (const s of students) {
      if (s.marks_obtained !== "" && (isNaN(Number(s.marks_obtained)) || Number(s.marks_obtained) < 0 || Number(s.marks_obtained) > maxMarks)) {
        toast({ title: "Validation Error", description: `${s.full_name}: marks must be 0-${maxMarks}`, variant: "destructive" });
        return;
      }
    }

    setSaving(true);
    const upserts = students
      .filter(s => s.marks_obtained !== "")
      .map(s => ({
        exam_subject_id: subjectId!,
        student_id: s.student_id,
        marks_obtained: Number(s.marks_obtained),
        remarks: s.remarks || null,
        entered_by: user?.id,
      }));

    if (upserts.length > 0) {
      const { error } = await supabase
        .from("student_marks")
        .upsert(upserts, { onConflict: "exam_subject_id,student_id" });

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Marks saved successfully" });
      }
    }
    setSaving(false);
  };

  if (loading) return <div className="p-6"><Skeleton className="h-8 w-64 mb-4" /><Skeleton className="h-96" /></div>;
  if (!examSubject || !exam) return <div className="p-6"><p className="text-muted-foreground">Not found</p></div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link to={`/exams/${examId}`}><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div>
          <h1 className="text-2xl font-bold">Marks Entry</h1>
          <p className="text-muted-foreground text-sm">
            {exam.name} • {(examSubject.subjects as any)?.name} ({(examSubject.subjects as any)?.code}) • Max: {examSubject.max_marks}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">{students.length} Student(s)</CardTitle>
          <Button onClick={handleSave} disabled={saving}><Save className="h-4 w-4 mr-2" />{saving ? "Saving..." : "Save All"}</Button>
        </CardHeader>
        <CardContent>
          {students.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No students enrolled in this class</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Marks (/{examSubject.max_marks})</TableHead>
                  <TableHead>Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((s, idx) => (
                  <TableRow key={s.student_id}>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell className="font-medium">{s.full_name}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        max={examSubject.max_marks}
                        value={s.marks_obtained}
                        onChange={e => updateMark(idx, "marks_obtained", e.target.value)}
                        className="w-24"
                        placeholder="—"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={s.remarks}
                        onChange={e => updateMark(idx, "remarks", e.target.value)}
                        placeholder="Optional"
                        className="w-40"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MarksEntry;

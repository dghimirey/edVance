import { useEffect, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Printer } from "lucide-react";

interface SubjectResult {
  subject_name: string;
  subject_code: string;
  max_marks: number;
  passing_marks: number;
  marks_obtained: number | null;
  percentage: number | null;
  grade: string;
  passed: boolean;
}

const StudentReport = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const [searchParams] = useSearchParams();
  const examId = searchParams.get("exam");
  const { role, user } = useAuth();
  const [student, setStudent] = useState<any>(null);
  const [exam, setExam] = useState<any>(null);
  const [results, setResults] = useState<SubjectResult[]>([]);
  const [gradingEntries, setGradingEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Students can only view their own
  const canView = role === "admin" || role === "teacher" || (role === "student" && studentId === user?.id);

  useEffect(() => {
    if (!canView || !examId || !studentId) { setLoading(false); return; }

    const load = async () => {
      // Fetch all in parallel
      const [studentRes, examRes, gradeRes] = await Promise.all([
        supabase.from("profiles").select("full_name, email").eq("user_id", studentId).single(),
        supabase.from("exams").select("*, classes(name, section)").eq("id", examId).single(),
        supabase.from("grading_scale_entries").select("*").order("min_percentage", { ascending: false }),
      ]);

      setStudent(studentRes.data);
      setExam(examRes.data);
      setGradingEntries(gradeRes.data || []);

      if (!examRes.data) { setLoading(false); return; }

      // Fetch exam subjects
      const { data: examSubjects } = await supabase
        .from("exam_subjects")
        .select("id, max_marks, passing_marks, subjects(name, code)")
        .eq("exam_id", examId);

      if (!examSubjects || examSubjects.length === 0) { setResults([]); setLoading(false); return; }

      // Fetch marks
      const esIds = examSubjects.map(es => es.id);
      const { data: marks } = await supabase
        .from("student_marks")
        .select("exam_subject_id, marks_obtained")
        .eq("student_id", studentId)
        .in("exam_subject_id", esIds);

      const marksMap = Object.fromEntries((marks || []).map(m => [m.exam_subject_id, m.marks_obtained]));
      const ge = gradeRes.data || [];

      const computeGrade = (pct: number): string => {
        const entry = ge.find((g: any) => pct >= g.min_percentage && pct <= g.max_percentage);
        return entry?.grade || "N/A";
      };

      const subjectResults: SubjectResult[] = examSubjects.map(es => {
        const obtained = marksMap[es.id] ?? null;
        const pct = obtained !== null ? (Number(obtained) / es.max_marks) * 100 : null;
        return {
          subject_name: (es.subjects as any)?.name || "",
          subject_code: (es.subjects as any)?.code || "",
          max_marks: es.max_marks,
          passing_marks: es.passing_marks,
          marks_obtained: obtained !== null ? Number(obtained) : null,
          percentage: pct !== null ? Math.round(pct * 100) / 100 : null,
          grade: pct !== null ? computeGrade(pct) : "—",
          passed: obtained !== null ? Number(obtained) >= es.passing_marks : false,
        };
      });

      setResults(subjectResults);
      setLoading(false);
    };
    load();
  }, [canView, examId, studentId]);

  if (loading) return <div className="p-6"><Skeleton className="h-8 w-64 mb-4" /><Skeleton className="h-96" /></div>;
  if (!canView) return <div className="p-6"><p className="text-muted-foreground">Access denied</p></div>;
  if (!exam || !student) return <div className="p-6"><p className="text-muted-foreground">Not found</p></div>;

  const totalObtained = results.reduce((sum, r) => sum + (r.marks_obtained ?? 0), 0);
  const totalMax = results.reduce((sum, r) => sum + r.max_marks, 0);
  const overallPct = totalMax > 0 ? Math.round((totalObtained / totalMax) * 10000) / 100 : 0;
  const overallGrade = gradingEntries.find(g => overallPct >= g.min_percentage && overallPct <= g.max_percentage)?.grade || "N/A";
  const allPassed = results.every(r => r.passed);
  const hasMarks = results.some(r => r.marks_obtained !== null);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-3">
          <Link to="/report-cards"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div>
            <h1 className="text-2xl font-bold">Report Card</h1>
            <p className="text-muted-foreground text-sm">{student.full_name} — {exam.name}</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4 mr-2" />Print</Button>
      </div>

      {/* Print header */}
      <div className="hidden print:block text-center mb-6">
        <h1 className="text-2xl font-bold">edVance School</h1>
        <h2 className="text-lg">{exam.name}</h2>
        <p className="text-sm text-muted-foreground">{(exam.classes as any)?.name} {(exam.classes as any)?.section && `- ${(exam.classes as any).section}`} • {exam.academic_year}</p>
        <p className="mt-2 font-medium">Student: {student.full_name}</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Subject-wise Results</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead className="text-center">Max</TableHead>
                <TableHead className="text-center">Obtained</TableHead>
                <TableHead className="text-center">%</TableHead>
                <TableHead className="text-center">Grade</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((r, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{r.subject_name} <span className="text-muted-foreground text-xs">({r.subject_code})</span></TableCell>
                  <TableCell className="text-center">{r.max_marks}</TableCell>
                  <TableCell className="text-center">{r.marks_obtained !== null ? r.marks_obtained : "—"}</TableCell>
                  <TableCell className="text-center">{r.percentage !== null ? `${r.percentage}%` : "—"}</TableCell>
                  <TableCell className="text-center font-bold">{r.grade}</TableCell>
                  <TableCell className="text-center">
                    {r.marks_obtained !== null ? (
                      <Badge variant={r.passed ? "default" : "destructive"}>{r.passed ? "Pass" : "Fail"}</Badge>
                    ) : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {hasMarks && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-sm text-muted-foreground">Total Marks</p>
                <p className="text-xl font-bold">{totalObtained} / {totalMax}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Overall %</p>
                <p className="text-xl font-bold">{overallPct}%</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Grade</p>
                <p className="text-xl font-bold">{overallGrade}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Result</p>
                <Badge variant={allPassed ? "default" : "destructive"} className="text-lg px-4 py-1">{allPassed ? "PASS" : "FAIL"}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StudentReport;

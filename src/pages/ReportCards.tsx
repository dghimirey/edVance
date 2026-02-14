import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { FileText } from "lucide-react";
import { Link } from "react-router-dom";

const ReportCards = () => {
  const { user, role } = useAuth();
  const [exams, setExams] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedExam, setSelectedExam] = useState("");
  const [loading, setLoading] = useState(true);

  const isStudent = role === "student";

  useEffect(() => {
    const load = async () => {
      const { data: examData } = await supabase.from("exams").select("id, name, class_id, classes(name, section)").order("created_at", { ascending: false });
      setExams(examData || []);
      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    if (!selectedExam) { setStudents([]); return; }
    const fetchStudents = async () => {
      const exam = exams.find(e => e.id === selectedExam);
      if (!exam) return;

      if (isStudent) {
        // Student sees their own report directly
        return;
      }

      const { data: enrollments } = await supabase
        .from("student_classes")
        .select("student_id")
        .eq("class_id", exam.class_id);

      const ids = (enrollments || []).map((e: any) => e.student_id);
      if (ids.length === 0) { setStudents([]); return; }

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", ids);
      setStudents(profiles || []);
    };
    fetchStudents();
  }, [selectedExam, isStudent, exams]);

  if (loading) return <div className="p-6"><Skeleton className="h-8 w-48 mb-4" /><Skeleton className="h-64" /></div>;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Report Cards</h1>
        <p className="text-muted-foreground text-sm">
          {isStudent ? "View your exam results" : "Select an exam and student to view report cards"}
        </p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div>
            <Label>Select Exam</Label>
            <Select value={selectedExam} onValueChange={setSelectedExam}>
              <SelectTrigger><SelectValue placeholder="Choose an exam" /></SelectTrigger>
              <SelectContent>
                {exams.map(e => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name} — {(e.classes as any)?.name} {(e.classes as any)?.section && `(${(e.classes as any).section})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isStudent && selectedExam && (
            <Link to={`/report-cards/${user?.id}?exam=${selectedExam}`}>
              <Button className="w-full mt-2"><FileText className="h-4 w-4 mr-2" />View My Report Card</Button>
            </Link>
          )}
        </CardContent>
      </Card>

      {!isStudent && selectedExam && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Students</CardTitle>
            <CardDescription>{students.length} student(s) enrolled</CardDescription>
          </CardHeader>
          <CardContent>
            {students.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No students enrolled</p>
            ) : (
              <div className="space-y-2">
                {students.map(s => (
                  <div key={s.user_id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium">{s.full_name}</p>
                      <p className="text-xs text-muted-foreground">{s.email}</p>
                    </div>
                    <Link to={`/report-cards/${s.user_id}?exam=${selectedExam}`}>
                      <Button variant="outline" size="sm"><FileText className="h-3 w-3 mr-1" />View</Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ReportCards;

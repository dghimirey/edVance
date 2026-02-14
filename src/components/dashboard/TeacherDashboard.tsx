import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { School, CalendarCheck, AlertCircle, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

const TeacherDashboard = () => {
  const { user, profile } = useAuth();
  const [assignedClasses, setAssignedClasses] = useState<any[]>([]);
  const [pendingAttendance, setPendingAttendance] = useState<any[]>([]);
  const [pendingMarks, setPendingMarks] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetch = async () => {
      const today = new Date().toISOString().split("T")[0];

      const { data: classes } = await supabase
        .from("classes")
        .select("id, name, section, grade_level")
        .eq("class_teacher_id", user.id);

      const myClasses = classes || [];
      setAssignedClasses(myClasses);

      // Find classes without attendance marked today
      const classIds = myClasses.map((c) => c.id);
      if (classIds.length > 0) {
        const { data: markedToday } = await supabase
          .from("attendance")
          .select("class_id")
          .eq("date", today)
          .in("class_id", classIds);

        const markedClassIds = new Set((markedToday || []).map((a: any) => a.class_id));
        setPendingAttendance(myClasses.filter((c) => !markedClassIds.has(c.id)));
      }

      // Count exams with unmarked subjects
      if (classIds.length > 0) {
        const { data: exams } = await supabase.from("exams").select("id, class_id").in("class_id", classIds);
        if (exams && exams.length > 0) {
          const examIds = exams.map(e => e.id);
          const { data: examSubjects } = await supabase.from("exam_subjects").select("id").in("exam_id", examIds);
          const esIds = (examSubjects || []).map(es => es.id);
          if (esIds.length > 0) {
            const { data: marks } = await supabase.from("student_marks").select("exam_subject_id").in("exam_subject_id", esIds);
            const markedEsIds = new Set((marks || []).map(m => m.exam_subject_id));
            setPendingMarks(esIds.filter(id => !markedEsIds.has(id)).length);
          }
        }
      }

      setLoading(false);
    };

    fetch();
  }, [user]);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome, {profile?.full_name || "Teacher"}</h1>
        <p className="text-muted-foreground text-sm">Your teaching overview</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Assigned Classes</p>
                <p className="text-2xl font-bold mt-1">{assignedClasses.length}</p>
              </div>
              <School className="h-8 w-8 text-primary opacity-80" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Attendance Today</p>
                <p className="text-2xl font-bold mt-1">{pendingAttendance.length}</p>
              </div>
              <AlertCircle className={`h-8 w-8 opacity-80 ${pendingAttendance.length > 0 ? "text-destructive" : "text-green-600 dark:text-green-400"}`} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Marks Entry</p>
                <p className="text-2xl font-bold mt-1">{pendingMarks}</p>
              </div>
              <FileText className={`h-8 w-8 opacity-80 ${pendingMarks > 0 ? "text-amber-600 dark:text-amber-400" : "text-green-600 dark:text-green-400"}`} />
            </div>
          </CardContent>
        </Card>
      </div>

      {pendingAttendance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mark Attendance</CardTitle>
            <CardDescription>These classes need attendance today</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pendingAttendance.map((cls) => (
                <div key={cls.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <p className="text-sm font-medium">{cls.name} {cls.section && `- ${cls.section}`}</p>
                  <Link to={`/attendance/mark/${cls.id}`}>
                    <Button size="sm">Mark</Button>
                  </Link>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {assignedClasses.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">My Classes</CardTitle>
              <CardDescription>{assignedClasses.length} class(es) assigned</CardDescription>
            </div>
            <Link to="/classes">
              <Button variant="outline" size="sm">View All</Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {assignedClasses.map((cls) => (
                <Link key={cls.id} to={`/classes/${cls.id}`} className="block">
                  <div className="flex items-center justify-between py-2 border-b last:border-0 hover:bg-muted/50 rounded px-2 -mx-2 transition-colors">
                    <div>
                      <p className="text-sm font-medium">{cls.name}</p>
                      <p className="text-xs text-muted-foreground">{cls.grade_level} {cls.section && `• ${cls.section}`}</p>
                    </div>
                    <CalendarCheck className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TeacherDashboard;

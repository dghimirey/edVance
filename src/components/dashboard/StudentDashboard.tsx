import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { School, CalendarCheck, Clock, Award } from "lucide-react";

const DAY_NAMES = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const StudentDashboard = () => {
  const { user, profile } = useAuth();
  const [myClass, setMyClass] = useState<any>(null);
  const [attendanceRate, setAttendanceRate] = useState<number | null>(null);
  const [todaySlots, setTodaySlots] = useState<any[]>([]);
  const [latestResult, setLatestResult] = useState<{ examName: string; percentage: number; grade: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetch = async () => {
      // Get student's class
      const { data: enrollment } = await supabase
        .from("student_classes")
        .select("class_id")
        .eq("student_id", user.id)
        .limit(1)
        .maybeSingle();

      if (enrollment) {
        const { data: cls } = await supabase
          .from("classes")
          .select("id, name, section, grade_level")
          .eq("id", enrollment.class_id)
          .single();
        setMyClass(cls);

        // Attendance rate
        const { data: records } = await supabase
          .from("attendance")
          .select("status")
          .eq("student_id", user.id)
          .eq("class_id", enrollment.class_id);

        if (records && records.length > 0) {
          const present = records.filter((r: any) => r.status === "present" || r.status === "late").length;
          setAttendanceRate(Math.round((present / records.length) * 100));
        }

        // Today's timetable
        const jsDay = new Date().getDay();
        const dbDay = jsDay === 0 ? 7 : jsDay;

        const { data: slots } = await supabase
          .from("timetable_slots")
          .select("start_time, end_time, room, subject_id")
          .eq("class_id", enrollment.class_id)
          .eq("day_of_week", dbDay)
          .order("start_time");

        if (slots && slots.length > 0) {
          const subjectIds = [...new Set(slots.map((s: any) => s.subject_id))];
          const { data: subjects } = await supabase.from("subjects").select("id, name").in("id", subjectIds);
          const subjectMap = Object.fromEntries((subjects || []).map((s: any) => [s.id, s.name]));
          setTodaySlots(slots.map((s: any) => ({ ...s, subject_name: subjectMap[s.subject_id] || "Unknown" })));
        }

        // Latest exam result
        const { data: myMarks } = await supabase
          .from("student_marks")
          .select("marks_obtained, exam_subject_id, exam_subjects(max_marks, exam_id, exams(name))")
          .eq("student_id", user.id)
          .order("created_at", { ascending: false })
          .limit(20);

        if (myMarks && myMarks.length > 0) {
          // Group by exam
          const byExam: Record<string, { name: string; obtained: number; max: number }> = {};
          for (const m of myMarks) {
            const es = m.exam_subjects as any;
            const examName = es?.exams?.name || "Exam";
            const examId = es?.exam_id;
            if (!examId) continue;
            if (!byExam[examId]) byExam[examId] = { name: examName, obtained: 0, max: 0 };
            byExam[examId].obtained += Number(m.marks_obtained) || 0;
            byExam[examId].max += es?.max_marks || 0;
          }
          const latest = Object.values(byExam)[0];
          if (latest && latest.max > 0) {
            const pct = Math.round((latest.obtained / latest.max) * 100);
            // Get grade
            const { data: grades } = await supabase.from("grading_scale_entries").select("grade, min_percentage, max_percentage").order("min_percentage", { ascending: false });
            const grade = (grades || []).find(g => pct >= g.min_percentage && pct <= g.max_percentage)?.grade || "N/A";
            setLatestResult({ examName: latest.name, percentage: pct, grade });
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      </div>
    );
  }

  const jsDay = new Date().getDay();
  const dbDay = jsDay === 0 ? 7 : jsDay;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome, {profile?.full_name || "Student"}</h1>
        <p className="text-muted-foreground text-sm">Your academic overview</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">My Class</p>
                <p className="text-lg font-bold mt-1">{myClass ? myClass.name : "Not enrolled"}</p>
              </div>
              <School className="h-8 w-8 text-primary opacity-80" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Attendance Rate</p>
                <p className="text-2xl font-bold mt-1">{attendanceRate !== null ? `${attendanceRate}%` : "N/A"}</p>
              </div>
              <CalendarCheck className={`h-8 w-8 opacity-80 ${attendanceRate !== null && attendanceRate >= 75 ? "text-green-600 dark:text-green-400" : "text-destructive"}`} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Today's Classes</p>
                <p className="text-2xl font-bold mt-1">{todaySlots.length}</p>
              </div>
              <Clock className="h-8 w-8 text-amber-600 dark:text-amber-400 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {latestResult && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Latest Exam Result</CardTitle>
            <CardDescription>{latestResult.examName}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Award className="h-6 w-6 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{latestResult.percentage}%</p>
                  <p className="text-xs text-muted-foreground">Percentage</p>
                </div>
              </div>
              <div>
                <Badge variant="outline" className="text-lg px-3 py-1">{latestResult.grade}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      {todaySlots.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Today's Timetable</CardTitle>
            <CardDescription>{DAY_NAMES[dbDay]}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {todaySlots.map((slot, idx) => (
                <div key={idx} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{slot.subject_name}</p>
                    <p className="text-xs text-muted-foreground">{slot.room && `Room: ${slot.room}`}</p>
                  </div>
                  <Badge variant="outline">
                    {slot.start_time?.slice(0, 5)} – {slot.end_time?.slice(0, 5)}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StudentDashboard;

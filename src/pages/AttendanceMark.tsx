import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

type AttendanceStatus = "present" | "absent" | "late" | "excused";

interface StudentAttendance {
  student_id: string;
  full_name: string;
  email: string;
  status: AttendanceStatus;
  remarks: string;
}

const AttendanceMark = () => {
  const { classId } = useParams<{ classId: string }>();
  const { user } = useAuth();
  const [cls, setCls] = useState<any>(null);
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [students, setStudents] = useState<StudentAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    if (!classId) return;
    const [classRes, enrollmentRes] = await Promise.all([
      supabase.from("classes").select("*").eq("id", classId).single(),
      supabase.from("student_classes").select("student_id").eq("class_id", classId),
    ]);

    setCls(classRes.data);
    const studentIds = (enrollmentRes.data || []).map((e: any) => e.student_id);

    if (studentIds.length) {
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, email").in("user_id", studentIds);
      
      // Check existing attendance for this date
      const { data: existing } = await supabase
        .from("attendance")
        .select("student_id, status, remarks")
        .eq("class_id", classId)
        .eq("date", date);

      const existingMap = new Map((existing || []).map((e: any) => [e.student_id, e]));

      setStudents(
        (profiles || []).map((p: any) => {
          const ex = existingMap.get(p.user_id);
          return {
            student_id: p.user_id,
            full_name: p.full_name,
            email: p.email,
            status: (ex?.status as AttendanceStatus) || "present",
            remarks: ex?.remarks || "",
          };
        })
      );
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [classId, date]);

  const updateStatus = (studentId: string, status: AttendanceStatus) => {
    setStudents((prev) => prev.map((s) => s.student_id === studentId ? { ...s, status } : s));
  };

  const updateRemarks = (studentId: string, remarks: string) => {
    setStudents((prev) => prev.map((s) => s.student_id === studentId ? { ...s, remarks } : s));
  };

  const markAll = (status: AttendanceStatus) => {
    setStudents((prev) => prev.map((s) => ({ ...s, status })));
  };

  const handleSave = async () => {
    if (!classId || !user) return;
    setSaving(true);

    const records = students.map((s) => ({
      student_id: s.student_id,
      class_id: classId,
      date,
      status: s.status,
      marked_by: user.id,
      remarks: s.remarks || null,
    }));

    // Upsert attendance records
    const { error } = await supabase.from("attendance").upsert(records, {
      onConflict: "student_id,class_id,date",
    });

    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Attendance saved for ${format(new Date(date), "MMM d, yyyy")}`);
  };

  if (loading) return <div className="p-6"><Skeleton className="h-64" /></div>;
  if (!cls) return <div className="p-6">Class not found.</div>;

  const statusOptions: AttendanceStatus[] = ["present", "absent", "late", "excused"];
  const statusColor: Record<string, string> = { present: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200", absent: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200", late: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200", excused: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/attendance"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Mark Attendance — {cls.name}</h1>
          <p className="text-sm text-muted-foreground">{students.length} students enrolled</p>
        </div>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-44" />
      </div>

      {/* Quick actions */}
      <div className="flex gap-2">
        <span className="text-sm text-muted-foreground mr-2 self-center">Mark all:</span>
        {statusOptions.map((s) => (
          <Button key={s} variant="outline" size="sm" onClick={() => markAll(s)} className="capitalize">{s}</Button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {students.map((student, idx) => (
              <div key={student.student_id} className="flex items-center gap-4 p-4">
                <span className="text-sm text-muted-foreground w-8">{idx + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{student.full_name}</p>
                  <p className="text-xs text-muted-foreground">{student.email}</p>
                </div>
                <div className="flex gap-1.5">
                  {statusOptions.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => updateStatus(student.student_id, opt)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors ${
                        student.status === opt ? statusColor[opt] : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
                <Input
                  placeholder="Remarks"
                  value={student.remarks}
                  onChange={(e) => updateRemarks(student.student_id, e.target.value)}
                  className="w-40"
                />
              </div>
            ))}
            {students.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No students enrolled in this class</p>
            )}
          </div>
        </CardContent>
      </Card>

      {students.length > 0 && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving} size="lg">
            <Save className="h-4 w-4 mr-2" />{saving ? "Saving..." : "Save Attendance"}
          </Button>
        </div>
      )}
    </div>
  );
};

export default AttendanceMark;

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClipboardCheck, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";

const statusColors: Record<string, string> = {
  present: "default",
  absent: "destructive",
  late: "secondary",
  excused: "outline",
};

const Attendance = () => {
  const { role, user } = useAuth();
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentSummary, setStudentSummary] = useState<any>(null);

  useEffect(() => {
    const fetchClasses = async () => {
      if (role === "admin") {
        const { data } = await supabase.from("classes").select("id, name");
        setClasses(data || []);
      } else if (role === "teacher") {
        const { data } = await supabase.from("classes").select("id, name").eq("class_teacher_id", user?.id);
        setClasses(data || []);
      } else if (role === "student") {
        const { data: enrollment } = await supabase.from("student_classes").select("class_id").eq("student_id", user?.id);
        if (enrollment?.length) {
          const classIds = enrollment.map((e: any) => e.class_id);
          const { data } = await supabase.from("classes").select("id, name").in("id", classIds);
          setClasses(data || []);
        }
        // Fetch student summary
        const { data: att } = await supabase.from("attendance").select("status").eq("student_id", user?.id);
        if (att?.length) {
          const total = att.length;
          const present = att.filter((a: any) => a.status === "present" || a.status === "late").length;
          setStudentSummary({ total, present, percentage: Math.round((present / total) * 100) });
        }
      }
      setLoading(false);
    };
    fetchClasses();
  }, [role, user]);

  useEffect(() => {
    const fetchRecords = async () => {
      if (!selectedClass) return;
      let query = supabase.from("attendance").select("*").eq("class_id", selectedClass);
      if (selectedDate) query = query.eq("date", selectedDate);
      const { data } = await query.order("date", { ascending: false });
      setRecords(data || []);
    };
    fetchRecords();
  }, [selectedClass, selectedDate]);

  if (loading) return <div className="p-6"><Skeleton className="h-64" /></div>;

  // Student view
  if (role === "student") {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold">My Attendance</h1>
        {studentSummary ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card><CardContent className="p-5 text-center"><p className="text-sm text-muted-foreground">Total Records</p><p className="text-2xl font-bold">{studentSummary.total}</p></CardContent></Card>
            <Card><CardContent className="p-5 text-center"><p className="text-sm text-muted-foreground">Present</p><p className="text-2xl font-bold">{studentSummary.present}</p></CardContent></Card>
            <Card><CardContent className="p-5 text-center"><p className="text-sm text-muted-foreground">Attendance %</p><p className="text-2xl font-bold">{studentSummary.percentage}%</p></CardContent></Card>
          </div>
        ) : (
          <p className="text-muted-foreground">No attendance records yet.</p>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Attendance</h1>
          <p className="text-sm text-muted-foreground">{role === "admin" ? "View attendance across all classes" : "Manage attendance for your classes"}</p>
        </div>
      </div>

      {/* Classes for marking */}
      {(role === "admin" || role === "teacher") && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your Classes</CardTitle>
            <CardDescription>Select a class to mark or view attendance</CardDescription>
          </CardHeader>
          <CardContent>
            {classes.length === 0 ? (
              <p className="text-muted-foreground text-sm">No classes assigned.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {classes.map((cls) => (
                  <Link key={cls.id} to={`/attendance/mark/${cls.id}`}>
                    <Card className="hover:border-primary transition-colors cursor-pointer">
                      <CardContent className="p-4 flex items-center gap-3">
                        <ClipboardCheck className="h-5 w-5 text-primary" />
                        <span className="font-medium">{cls.name}</span>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Attendance Records */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Attendance Records</CardTitle>
          <div className="flex gap-3 mt-2">
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Select class" /></SelectTrigger>
              <SelectContent>
                {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-48" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {selectedClass ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.date}</TableCell>
                    <TableCell className="text-sm">{r.student_id.substring(0, 8)}...</TableCell>
                    <TableCell><Badge variant={statusColors[r.status] as any}>{r.status}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.remarks || "—"}</TableCell>
                  </TableRow>
                ))}
                {records.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No records found</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-8">Select a class to view records</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Attendance;

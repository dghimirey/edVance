import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Plus, Trash2, BookOpen, Users, UserPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";

const ClassDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [cls, setCls] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [classSubjects, setClassSubjects] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [allSubjects, setAllSubjects] = useState<any[]>([]);
  const [allTeachers, setAllTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addStudentOpen, setAddStudentOpen] = useState(false);
  const [createStudentOpen, setCreateStudentOpen] = useState(false);
  const [addSubjectOpen, setAddSubjectOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [newStudent, setNewStudent] = useState({ full_name: "", email: "", phone: "", date_of_birth: "", address: "" });
  const [creatingStudent, setCreatingStudent] = useState(false);

  const fetchData = async () => {
    if (!id) return;
    const [classRes, studentsRes, csRes, subjectsRes, teacherRolesRes] = await Promise.all([
      supabase.from("classes").select("*").eq("id", id).single(),
      supabase.from("student_classes").select("student_id").eq("class_id", id),
      supabase.from("class_subjects").select("*, subjects(name, code)").eq("class_id", id),
      supabase.from("subjects").select("*"),
      supabase.from("user_roles").select("user_id").eq("role", "teacher"),
    ]);

    setCls(classRes.data);
    setAllSubjects(subjectsRes.data || []);
    setClassSubjects(csRes.data || []);

    const studentIds = (studentsRes.data || []).map((s: any) => s.student_id);
    if (studentIds.length) {
      const { data: studentProfiles } = await supabase.from("profiles").select("user_id, full_name, email").in("user_id", studentIds);
      setStudents(studentProfiles || []);
    } else {
      setStudents([]);
    }

    const { data: studentRoles } = await supabase.from("user_roles").select("user_id").eq("role", "student");
    if (studentRoles?.length) {
      const sIds = studentRoles.map((s: any) => s.user_id);
      const { data: sp } = await supabase.from("profiles").select("user_id, full_name, email").in("user_id", sIds).eq("status", "approved");
      setAllStudents(sp || []);
    }

    const teacherIds = (teacherRolesRes.data || []).map((t: any) => t.user_id);
    if (teacherIds.length) {
      const { data: tp } = await supabase.from("profiles").select("user_id, full_name, email").in("user_id", teacherIds).eq("status", "approved");
      setAllTeachers(tp || []);
    }

    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [id]);

  const addStudent = async () => {
    if (!selectedStudent || !id) return;
    const { error } = await supabase.from("student_classes").insert({ student_id: selectedStudent, class_id: id });
    if (error) { toast.error(error.message); return; }
    toast.success("Student added");
    setAddStudentOpen(false);
    setSelectedStudent("");
    fetchData();
  };

  const removeStudent = async (studentId: string) => {
    if (!id) return;
    const { error } = await supabase.from("student_classes").delete().eq("student_id", studentId).eq("class_id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Student removed");
    fetchData();
  };

  const addSubject = async () => {
    if (!selectedSubject || !id) return;
    const { error } = await supabase.from("class_subjects").insert({
      class_id: id,
      subject_id: selectedSubject,
      teacher_id: selectedTeacher || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Subject added");
    setAddSubjectOpen(false);
    setSelectedSubject("");
    setSelectedTeacher("");
    fetchData();
  };

  const createStudent = async () => {
    if (!newStudent.full_name || !newStudent.email) { toast.error("Name and email are required"); return; }
    setCreatingStudent(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-student`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ ...newStudent, class_id: id }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      toast.success(`Student created! Temp password: ${result.temp_password}`, { duration: 15000 });
      setCreateStudentOpen(false);
      setNewStudent({ full_name: "", email: "", phone: "", date_of_birth: "", address: "" });
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
    setCreatingStudent(false);
  };

  const removeSubject = async (csId: string) => {
    const { error } = await supabase.from("class_subjects").delete().eq("id", csId);
    if (error) { toast.error(error.message); return; }
    toast.success("Subject removed");
    fetchData();
  };

  if (loading) return <div className="p-6"><Skeleton className="h-64" /></div>;
  if (!cls) return <div className="p-6">Class not found.</div>;

  const enrolledIds = students.map((s) => s.user_id);
  const availableStudents = allStudents.filter((s) => !enrolledIds.includes(s.user_id));
  const assignedSubjectIds = classSubjects.map((cs: any) => cs.subject_id);
  const availableSubjects = allSubjects.filter((s) => !assignedSubjectIds.includes(s.id));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/classes"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div>
          <h1 className="text-2xl font-bold">{cls.name}</h1>
          <p className="text-sm text-muted-foreground">{cls.grade_level && `Grade ${cls.grade_level}`} {cls.section && `• Section ${cls.section}`} • {cls.academic_year}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Students */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div><CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" />Students ({students.length})</CardTitle></div>
            <div className="flex gap-2">
              <Dialog open={createStudentOpen} onOpenChange={setCreateStudentOpen}>
                <DialogTrigger asChild><Button size="sm" variant="outline"><UserPlus className="h-4 w-4 mr-1" />Create</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Create New Student</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div><Label>Full Name *</Label><Input value={newStudent.full_name} onChange={(e) => setNewStudent({ ...newStudent, full_name: e.target.value })} /></div>
                    <div><Label>Email *</Label><Input type="email" value={newStudent.email} onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })} /></div>
                    <div><Label>Phone</Label><Input value={newStudent.phone} onChange={(e) => setNewStudent({ ...newStudent, phone: e.target.value })} /></div>
                    <div><Label>Date of Birth</Label><Input type="date" value={newStudent.date_of_birth} onChange={(e) => setNewStudent({ ...newStudent, date_of_birth: e.target.value })} /></div>
                    <div><Label>Address</Label><Input value={newStudent.address} onChange={(e) => setNewStudent({ ...newStudent, address: e.target.value })} /></div>
                    <Button onClick={createStudent} disabled={creatingStudent} className="w-full">
                      {creatingStudent ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Student"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Dialog open={addStudentOpen} onOpenChange={setAddStudentOpen}>
                <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Add Existing</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add Existing Student</DialogTitle></DialogHeader>
                  <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                    <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                    <SelectContent>
                      {availableStudents.map((s) => <SelectItem key={s.user_id} value={s.user_id}>{s.full_name} ({s.email})</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button onClick={addStudent} disabled={!selectedStudent}>Add</Button>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {students.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No students enrolled</p>
            ) : (
              <div className="space-y-2">
                {students.map((s) => (
                  <div key={s.user_id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div><p className="text-sm font-medium">{s.full_name}</p><p className="text-xs text-muted-foreground">{s.email}</p></div>
                    <Button variant="ghost" size="icon" onClick={() => removeStudent(s.user_id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Subjects */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div><CardTitle className="text-base flex items-center gap-2"><BookOpen className="h-4 w-4" />Subjects ({classSubjects.length})</CardTitle></div>
            <Dialog open={addSubjectOpen} onOpenChange={setAddSubjectOpen}>
              <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Add</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Subject to Class</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Subject</Label>
                    <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                      <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                      <SelectContent>
                        {availableSubjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name} ({s.code})</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Teacher (optional)</Label>
                    <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                      <SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger>
                      <SelectContent>
                        {allTeachers.map((t) => <SelectItem key={t.user_id} value={t.user_id}>{t.full_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={addSubject} disabled={!selectedSubject}>Add</Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {classSubjects.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No subjects assigned</p>
            ) : (
              <div className="space-y-2">
                {classSubjects.map((cs: any) => (
                  <div key={cs.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium">{cs.subjects?.name}</p>
                      <p className="text-xs text-muted-foreground">{cs.subjects?.code} • {allTeachers.find((t) => t.user_id === cs.teacher_id)?.full_name || "No teacher"}</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeSubject(cs.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ClassDetail;

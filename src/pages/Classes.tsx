import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

interface ClassItem {
  id: string;
  name: string;
  section: string | null;
  grade_level: string | null;
  academic_year: string;
  class_teacher_id: string | null;
  created_at: string;
}

interface Teacher {
  user_id: string;
  full_name: string;
  email: string;
}

const Classes = () => {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);
  const [form, setForm] = useState({ name: "", section: "", grade_level: "", academic_year: "2025-2026", class_teacher_id: "" });

  const fetchData = async () => {
    const [classesRes, teachersRes] = await Promise.all([
      supabase.from("classes").select("*").order("name"),
      supabase.from("user_roles").select("user_id").eq("role", "teacher"),
    ]);

    setClasses((classesRes.data as ClassItem[]) || []);

    if (teachersRes.data?.length) {
      const teacherIds = teachersRes.data.map((t: any) => t.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", teacherIds)
        .eq("status", "approved");
      setTeachers((profiles as Teacher[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const openCreate = () => {
    setEditingClass(null);
    setForm({ name: "", section: "", grade_level: "", academic_year: "2025-2026", class_teacher_id: "" });
    setDialogOpen(true);
  };

  const openEdit = (cls: ClassItem) => {
    setEditingClass(cls);
    setForm({
      name: cls.name,
      section: cls.section || "",
      grade_level: cls.grade_level || "",
      academic_year: cls.academic_year,
      class_teacher_id: cls.class_teacher_id || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Class name is required"); return; }

    const payload = {
      name: form.name,
      section: form.section || null,
      grade_level: form.grade_level || null,
      academic_year: form.academic_year,
      class_teacher_id: form.class_teacher_id || null,
    };

    if (editingClass) {
      const { error } = await supabase.from("classes").update(payload).eq("id", editingClass.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Class updated");
    } else {
      const { error } = await supabase.from("classes").insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success("Class created");
    }
    setDialogOpen(false);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this class?")) return;
    const { error } = await supabase.from("classes").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Class deleted");
    fetchData();
  };

  const getTeacherName = (id: string | null) => {
    if (!id) return "—";
    return teachers.find((t) => t.user_id === id)?.full_name || "Unknown";
  };

  if (loading) return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64" />
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Classes</h1>
          <p className="text-sm text-muted-foreground">Manage school classes and sections</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Add Class</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingClass ? "Edit Class" : "Create Class"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Class 10-A" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Section</Label><Input value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} placeholder="A" /></div>
                <div><Label>Grade Level</Label><Input value={form.grade_level} onChange={(e) => setForm({ ...form, grade_level: e.target.value })} placeholder="10" /></div>
              </div>
              <div><Label>Academic Year</Label><Input value={form.academic_year} onChange={(e) => setForm({ ...form, academic_year: e.target.value })} /></div>
              <div>
                <Label>Class Teacher</Label>
                <Select value={form.class_teacher_id} onValueChange={(v) => setForm({ ...form, class_teacher_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select a teacher" /></SelectTrigger>
                  <SelectContent>
                    {teachers.map((t) => (
                      <SelectItem key={t.user_id} value={t.user_id}>{t.full_name} ({t.email})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSave} className="w-full">{editingClass ? "Update" : "Create"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Section</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Year</TableHead>
                <TableHead>Class Teacher</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {classes.map((cls) => (
                <TableRow key={cls.id}>
                  <TableCell className="font-medium">
                    <Link to={`/classes/${cls.id}`} className="text-primary hover:underline">{cls.name}</Link>
                  </TableCell>
                  <TableCell>{cls.section || "—"}</TableCell>
                  <TableCell>{cls.grade_level || "—"}</TableCell>
                  <TableCell><Badge variant="outline">{cls.academic_year}</Badge></TableCell>
                  <TableCell>{getTeacherName(cls.class_teacher_id)}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(cls)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(cls.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {classes.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No classes yet. Create your first class.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Classes;

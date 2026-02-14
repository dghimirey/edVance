import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, ArrowLeft, Pencil } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const ExamDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { role } = useAuth();
  const [exam, setExam] = useState<any>(null);
  const [examSubjects, setExamSubjects] = useState<any[]>([]);
  const [allSubjects, setAllSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ subject_id: "", max_marks: "100", passing_marks: "35", exam_date: "" });

  const isAdmin = role === "admin";

  const fetchData = async () => {
    const [examRes, esRes] = await Promise.all([
      supabase.from("exams").select("*, classes(name, section)").eq("id", id!).single(),
      supabase.from("exam_subjects").select("*, subjects(name, code)").eq("exam_id", id!),
    ]);
    setExam(examRes.data);
    setExamSubjects(esRes.data || []);
  };

  useEffect(() => {
    const load = async () => {
      await fetchData();
      if (isAdmin) {
        const { data } = await supabase.from("subjects").select("id, name, code");
        setAllSubjects(data || []);
      }
      setLoading(false);
    };
    load();
  }, [id, isAdmin]);

  const handleAddSubject = async () => {
    if (!form.subject_id) {
      toast({ title: "Error", description: "Select a subject", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("exam_subjects").insert({
      exam_id: id!,
      subject_id: form.subject_id,
      max_marks: parseInt(form.max_marks) || 100,
      passing_marks: parseInt(form.passing_marks) || 35,
      exam_date: form.exam_date || null,
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Subject added" });
      setDialogOpen(false);
      setForm({ subject_id: "", max_marks: "100", passing_marks: "35", exam_date: "" });
      fetchData();
    }
  };

  const handleDeleteSubject = async (esId: string) => {
    await supabase.from("exam_subjects").delete().eq("id", esId);
    fetchData();
  };

  if (loading) return <div className="p-6"><Skeleton className="h-8 w-64 mb-4" /><Skeleton className="h-64" /></div>;
  if (!exam) return <div className="p-6"><p className="text-muted-foreground">Exam not found</p></div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/exams"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div>
          <h1 className="text-2xl font-bold">{exam.name}</h1>
          <p className="text-muted-foreground text-sm">
            {(exam.classes as any)?.name} {(exam.classes as any)?.section && `- ${(exam.classes as any).section}`} • {exam.exam_type.replace("_", " ")}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Exam Subjects</CardTitle>
            <CardDescription>{examSubjects.length} subject(s)</CardDescription>
          </div>
          {isAdmin && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-2" />Add Subject</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Subject to Exam</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div><Label>Subject</Label>
                    <Select value={form.subject_id} onValueChange={v => setForm(f => ({ ...f, subject_id: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                      <SelectContent>{allSubjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name} ({s.code})</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Max Marks</Label><Input type="number" value={form.max_marks} onChange={e => setForm(f => ({ ...f, max_marks: e.target.value }))} /></div>
                    <div><Label>Passing Marks</Label><Input type="number" value={form.passing_marks} onChange={e => setForm(f => ({ ...f, passing_marks: e.target.value }))} /></div>
                  </div>
                  <div><Label>Exam Date</Label><Input type="date" value={form.exam_date} onChange={e => setForm(f => ({ ...f, exam_date: e.target.value }))} /></div>
                  <Button onClick={handleAddSubject} className="w-full">Add</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent>
          {examSubjects.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No subjects added yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Max Marks</TableHead>
                  <TableHead>Passing</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {examSubjects.map(es => (
                  <TableRow key={es.id}>
                    <TableCell className="font-medium">{(es.subjects as any)?.name} <span className="text-muted-foreground">({(es.subjects as any)?.code})</span></TableCell>
                    <TableCell>{es.max_marks}</TableCell>
                    <TableCell>{es.passing_marks}</TableCell>
                    <TableCell>{es.exam_date || "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-2 justify-end">
                        {(isAdmin || role === "teacher") && (
                          <Link to={`/exams/${id}/marks/${es.id}`}>
                            <Button variant="outline" size="sm"><Pencil className="h-3 w-3 mr-1" />Marks</Button>
                          </Link>
                        )}
                        {isAdmin && <Button variant="destructive" size="sm" onClick={() => handleDeleteSubject(es.id)}>Remove</Button>}
                      </div>
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

export default ExamDetail;

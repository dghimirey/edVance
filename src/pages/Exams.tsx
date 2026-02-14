import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

const EXAM_TYPES = ["midterm", "final", "unit_test", "quiz"];

const Exams = () => {
  const { user, role } = useAuth();
  const [exams, setExams] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: "", exam_type: "midterm", class_id: "", start_date: "", end_date: "" });

  const isAdmin = role === "admin";

  const fetchExams = async () => {
    const { data } = await supabase
      .from("exams")
      .select("*, classes(name, section)")
      .order("created_at", { ascending: false });
    setExams(data || []);
  };

  useEffect(() => {
    const load = async () => {
      await fetchExams();
      if (isAdmin) {
        const { data } = await supabase.from("classes").select("id, name, section");
        setClasses(data || []);
      }
      setLoading(false);
    };
    load();
  }, [isAdmin]);

  const handleCreate = async () => {
    if (!form.name || !form.class_id) {
      toast({ title: "Error", description: "Name and class are required", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("exams").insert({
      name: form.name,
      exam_type: form.exam_type,
      class_id: form.class_id,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      created_by: user?.id,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Exam created" });
      setDialogOpen(false);
      setForm({ name: "", exam_type: "midterm", class_id: "", start_date: "", end_date: "" });
      fetchExams();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("exams").delete().eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else fetchExams();
  };

  if (loading) return <div className="p-6"><Skeleton className="h-8 w-48 mb-4" /><Skeleton className="h-64" /></div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Exams</h1>
          <p className="text-muted-foreground text-sm">Manage examinations</p>
        </div>
        {isAdmin && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />New Exam</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Exam</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Mid-Term Exam 2025" /></div>
                <div><Label>Type</Label>
                  <Select value={form.exam_type} onValueChange={v => setForm(f => ({ ...f, exam_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{EXAM_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Class</Label>
                  <Select value={form.class_id} onValueChange={v => setForm(f => ({ ...f, class_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                    <SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name} {c.section && `- ${c.section}`}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Start Date</Label><Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} /></div>
                  <div><Label>End Date</Label><Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} /></div>
                </div>
                <Button onClick={handleCreate} className="w-full">Create</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {exams.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground"><FileText className="h-10 w-10 mx-auto mb-2 opacity-40" /><p>No exams yet</p></CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {exams.map(exam => (
            <Card key={exam.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{exam.name}</CardTitle>
                  <Badge variant="outline">{exam.exam_type.replace("_", " ")}</Badge>
                </div>
                <CardDescription>{(exam.classes as any)?.name} {(exam.classes as any)?.section && `- ${(exam.classes as any).section}`}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground space-y-1 mb-3">
                  {exam.start_date && <p>Start: {exam.start_date}</p>}
                  {exam.end_date && <p>End: {exam.end_date}</p>}
                  <p>Year: {exam.academic_year}</p>
                </div>
                <div className="flex gap-2">
                  <Link to={`/exams/${exam.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">View Details</Button>
                  </Link>
                  {isAdmin && <Button variant="destructive" size="sm" onClick={() => handleDelete(exam.id)}>Delete</Button>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Exams;

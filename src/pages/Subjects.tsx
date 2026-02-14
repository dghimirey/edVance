import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Subject {
  id: string;
  name: string;
  code: string;
  description: string | null;
  created_at: string;
}

const Subjects = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [form, setForm] = useState({ name: "", code: "", description: "" });

  const fetchSubjects = async () => {
    const { data } = await supabase.from("subjects").select("*").order("name");
    setSubjects((data as Subject[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchSubjects(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", code: "", description: "" });
    setDialogOpen(true);
  };

  const openEdit = (s: Subject) => {
    setEditing(s);
    setForm({ name: s.name, code: s.code, description: s.description || "" });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.code.trim()) { toast.error("Name and code are required"); return; }
    const payload = { name: form.name, code: form.code, description: form.description || null };

    if (editing) {
      const { error } = await supabase.from("subjects").update(payload).eq("id", editing.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Subject updated");
    } else {
      const { error } = await supabase.from("subjects").insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success("Subject created");
    }
    setDialogOpen(false);
    fetchSubjects();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this subject?")) return;
    const { error } = await supabase.from("subjects").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Subject deleted");
    fetchSubjects();
  };

  if (loading) return <div className="p-6 space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64" /></div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Subjects</h1>
          <p className="text-sm text-muted-foreground">Manage subjects offered at the school</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Add Subject</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "Edit Subject" : "Create Subject"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Mathematics" /></div>
              <div><Label>Code *</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="MATH101" /></div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional description" /></div>
              <Button onClick={handleSave} className="w-full">{editing ? "Update" : "Create"}</Button>
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
                <TableHead>Code</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subjects.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell><code className="text-xs bg-muted px-2 py-1 rounded">{s.code}</code></TableCell>
                  <TableCell className="text-muted-foreground text-sm">{s.description || "—"}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {subjects.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No subjects yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Subjects;

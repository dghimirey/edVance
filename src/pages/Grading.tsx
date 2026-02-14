import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const Grading = () => {
  const [scales, setScales] = useState<any[]>([]);
  const [selectedScale, setSelectedScale] = useState<any>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scaleDialog, setScaleDialog] = useState(false);
  const [entryDialog, setEntryDialog] = useState(false);
  const [scaleName, setScaleName] = useState("");
  const [entryForm, setEntryForm] = useState({ grade: "", min_percentage: "", max_percentage: "", grade_point: "" });

  const fetchScales = async () => {
    const { data } = await supabase.from("grading_scales").select("*").order("created_at");
    setScales(data || []);
    if (data && data.length > 0 && !selectedScale) setSelectedScale(data[0]);
  };

  const fetchEntries = async (scaleId: string) => {
    const { data } = await supabase.from("grading_scale_entries").select("*").eq("scale_id", scaleId).order("min_percentage", { ascending: false });
    setEntries(data || []);
  };

  useEffect(() => { fetchScales().then(() => setLoading(false)); }, []);
  useEffect(() => { if (selectedScale) fetchEntries(selectedScale.id); }, [selectedScale]);

  const handleCreateScale = async () => {
    if (!scaleName.trim()) return;
    const { data, error } = await supabase.from("grading_scales").insert({ name: scaleName }).select().single();
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      setScaleDialog(false);
      setScaleName("");
      await fetchScales();
      setSelectedScale(data);
    }
  };

  const handleAddEntry = async () => {
    if (!selectedScale || !entryForm.grade) return;
    const { error } = await supabase.from("grading_scale_entries").insert({
      scale_id: selectedScale.id,
      grade: entryForm.grade,
      min_percentage: parseFloat(entryForm.min_percentage) || 0,
      max_percentage: parseFloat(entryForm.max_percentage) || 100,
      grade_point: entryForm.grade_point ? parseFloat(entryForm.grade_point) : null,
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      setEntryDialog(false);
      setEntryForm({ grade: "", min_percentage: "", max_percentage: "", grade_point: "" });
      fetchEntries(selectedScale.id);
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    await supabase.from("grading_scale_entries").delete().eq("id", entryId);
    if (selectedScale) fetchEntries(selectedScale.id);
  };

  const handleDeleteScale = async (scaleId: string) => {
    await supabase.from("grading_scales").delete().eq("id", scaleId);
    setSelectedScale(null);
    setEntries([]);
    fetchScales();
  };

  if (loading) return <div className="p-6"><Skeleton className="h-8 w-48 mb-4" /><Skeleton className="h-64" /></div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Grading Scales</h1>
          <p className="text-muted-foreground text-sm">Manage grade-percentage mappings</p>
        </div>
        <Dialog open={scaleDialog} onOpenChange={setScaleDialog}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />New Scale</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Grading Scale</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Name</Label><Input value={scaleName} onChange={e => setScaleName(e.target.value)} placeholder="e.g. Default Scale" /></div>
              <Button onClick={handleCreateScale} className="w-full">Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-2 flex-wrap">
        {scales.map(s => (
          <Button key={s.id} variant={selectedScale?.id === s.id ? "default" : "outline"} size="sm" onClick={() => setSelectedScale(s)}>
            {s.name}
          </Button>
        ))}
      </div>

      {selectedScale && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">{selectedScale.name}</CardTitle>
              <CardDescription>{selectedScale.academic_year}</CardDescription>
            </div>
            <div className="flex gap-2">
              <Dialog open={entryDialog} onOpenChange={setEntryDialog}>
                <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-2" />Add Grade</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add Grade Entry</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div><Label>Grade</Label><Input value={entryForm.grade} onChange={e => setEntryForm(f => ({ ...f, grade: e.target.value }))} placeholder="e.g. A+" /></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label>Min %</Label><Input type="number" value={entryForm.min_percentage} onChange={e => setEntryForm(f => ({ ...f, min_percentage: e.target.value }))} /></div>
                      <div><Label>Max %</Label><Input type="number" value={entryForm.max_percentage} onChange={e => setEntryForm(f => ({ ...f, max_percentage: e.target.value }))} /></div>
                    </div>
                    <div><Label>Grade Point (optional)</Label><Input type="number" step="0.1" value={entryForm.grade_point} onChange={e => setEntryForm(f => ({ ...f, grade_point: e.target.value }))} /></div>
                    <Button onClick={handleAddEntry} className="w-full">Add</Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Button variant="destructive" size="sm" onClick={() => handleDeleteScale(selectedScale.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent>
            {entries.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No grade entries</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Grade</TableHead>
                    <TableHead>Min %</TableHead>
                    <TableHead>Max %</TableHead>
                    <TableHead>Grade Point</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map(e => (
                    <TableRow key={e.id}>
                      <TableCell className="font-bold">{e.grade}</TableCell>
                      <TableCell>{e.min_percentage}</TableCell>
                      <TableCell>{e.max_percentage}</TableCell>
                      <TableCell>{e.grade_point ?? "—"}</TableCell>
                      <TableCell><Button variant="ghost" size="sm" onClick={() => handleDeleteEntry(e.id)}><Trash2 className="h-3 w-3" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Grading;

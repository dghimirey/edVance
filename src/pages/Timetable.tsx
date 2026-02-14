import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const DAYS = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const TIME_SLOTS = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"];

interface TimetableSlot {
  id: string;
  day_of_week: number;
  start_time: string;
  subjects?: { name: string; code: string };
  room?: string;
}

interface ClassItem {
  id: string;
  name: string;
}

interface Subject {
  id: string;
  name: string;
  code: string;
}

interface Teacher {
  user_id: string;
  full_name: string;
}

const Timetable = () => {
  const { role, user } = useAuth();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ subject_id: "", teacher_id: "", day_of_week: "1", start_time: "08:00", end_time: "09:00", room: "" });

  useEffect(() => {
    const init = async () => {
      if (role === "admin") {
        const [{ data: cls }, { data: subs }, { data: tRoles }] = await Promise.all([
          supabase.from("classes").select("id, name"),
          supabase.from("subjects").select("id, name, code"),
          supabase.from("user_roles").select("user_id").eq("role", "teacher"),
        ]);
        setClasses(cls || []);
        setSubjects(subs || []);
        if (tRoles?.length) {
          const { data: tp } = await supabase.from("profiles").select("user_id, full_name").in("user_id", tRoles.map((t: { user_id: string }) => t.user_id));
          setTeachers(tp || []);
        }
      } else if (role === "teacher") {
        const { data: cls } = await supabase.from("classes").select("id, name").eq("class_teacher_id", user?.id);
        setClasses(cls || []);
        // Also fetch teacher's timetable directly
        const { data: ts } = await supabase.from("timetable_slots").select("*, subjects(name, code), classes(name)").eq("teacher_id", user?.id);
        setSlots(ts || []);
      } else if (role === "student") {
        const { data: enrollment } = await supabase.from("student_classes").select("class_id").eq("student_id", user?.id);
        if (enrollment?.length) {
          const classIds = enrollment.map((e: { class_id: string }) => e.class_id);
          const { data: cls } = await supabase.from("classes").select("id, name").in("id", classIds);
          setClasses(cls || []);
          if (classIds.length === 1) {
            setSelectedClass(classIds[0]);
          }
        }
      }
      setLoading(false);
    };
    init();
  }, [role, user]);

  useEffect(() => {
    if (!selectedClass) return;
    const fetchSlots = async () => {
      const { data } = await supabase
        .from("timetable_slots")
        .select("*, subjects(name, code)")
        .eq("class_id", selectedClass)
        .order("day_of_week")
        .order("start_time");
      setSlots(data || []);
    };
    fetchSlots();
  }, [selectedClass]);

  const handleAdd = async () => {
    if (!selectedClass || !form.subject_id) { toast.error("Select a subject"); return; }
    const { error } = await supabase.from("timetable_slots").insert({
      class_id: selectedClass,
      subject_id: form.subject_id,
      teacher_id: form.teacher_id || null,
      day_of_week: parseInt(form.day_of_week),
      start_time: form.start_time,
      end_time: form.end_time,
      room: form.room || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Slot added");
    setDialogOpen(false);
    // Refresh
    const { data } = await supabase.from("timetable_slots").select("*, subjects(name, code)").eq("class_id", selectedClass).order("day_of_week").order("start_time");
    setSlots(data || []);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("timetable_slots").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setSlots((prev) => prev.filter((s) => s.id !== id));
    toast.success("Slot removed");
  };

  if (loading) return <div className="p-6"><Skeleton className="h-64" /></div>;

  // Build grid data
  const gridDays = [1, 2, 3, 4, 5, 6]; // Mon-Sat
  const getSlotAt = (day: number, time: string) => slots.filter((s) => s.day_of_week === day && s.start_time === time + ":00");

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Timetable</h1>
          <p className="text-sm text-muted-foreground">
            {role === "admin" ? "Manage class timetables" : role === "teacher" ? "Your teaching schedule" : "Your class timetable"}
          </p>
        </div>
        <div className="flex gap-3 items-center">
          {classes.length > 0 && (
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Select class" /></SelectTrigger>
              <SelectContent>
                {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          {role === "admin" && selectedClass && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Add Slot</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Timetable Slot</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Subject</Label>
                    <Select value={form.subject_id} onValueChange={(v) => setForm({ ...form, subject_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                      <SelectContent>{subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Teacher</Label>
                    <Select value={form.teacher_id} onValueChange={(v) => setForm({ ...form, teacher_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger>
                      <SelectContent>{teachers.map((t) => <SelectItem key={t.user_id} value={t.user_id}>{t.full_name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Day</Label>
                    <Select value={form.day_of_week} onValueChange={(v) => setForm({ ...form, day_of_week: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{gridDays.map((d) => <SelectItem key={d} value={String(d)}>{DAYS[d]}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Start Time</Label><Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} /></div>
                    <div><Label>End Time</Label><Input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} /></div>
                  </div>
                  <div><Label>Room</Label><Input value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} placeholder="e.g. Room 101" /></div>
                  <Button onClick={handleAdd} className="w-full">Add Slot</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {!selectedClass && role !== "teacher" ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Select a class to view the timetable</CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="p-3 text-left font-medium text-muted-foreground w-20">Time</th>
                  {gridDays.map((d) => (
                    <th key={d} className="p-3 text-center font-medium text-muted-foreground">{DAYS[d]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TIME_SLOTS.map((time) => (
                  <tr key={time} className="border-b">
                    <td className="p-3 text-muted-foreground font-mono text-xs">{time}</td>
                    {gridDays.map((day) => {
                      const daySlots = getSlotAt(day, time);
                      return (
                        <td key={day} className="p-1.5">
                          {daySlots.map((slot) => (
                            <div key={slot.id} className="bg-primary/10 border border-primary/20 rounded-md p-2 text-xs relative group">
                              <p className="font-medium text-primary">{slot.subjects?.name}</p>
                              {slot.room && <p className="text-muted-foreground">{slot.room}</p>}
                              {role === "admin" && (
                                <button
                                  onClick={() => handleDelete(slot.id)}
                                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <Trash2 className="h-3 w-3 text-destructive" />
                                </button>
                              )}
                            </div>
                          ))}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Timetable;

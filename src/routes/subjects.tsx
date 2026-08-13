import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AlertTriangle, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { api } from "@/lib/api";
import type { Subject } from "@/lib/mock";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/subjects")({
  head: () => ({
    meta: [
      { title: "Subjects & Classes — AttendAI" },
      {
        name: "description",
        content: "Create subjects and class sections and assign teachers to each class.",
      },
      { property: "og:title", content: "Subjects & Classes — AttendAI" },
      { property: "og:description", content: "Manage subjects, sections and teacher assignments." },
    ],
  }),
  component: SubjectsPage,
});

const teachers = [
  { id: "u1", name: "Dr. Anita Rao" },
  { id: "u3", name: "Dr. K. Iyer" },
  { id: "u4", name: "Prof. M. Bose" },
];

const empty = { code: "", name: "", section: "", teacherId: "u1", schedule: "" };

function SubjectsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState<string | null>(null);

  const query = useQuery({ queryKey: ["subjects"], queryFn: () => api.listSubjects() });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        ...form,
        teacherName: teachers.find((t) => t.id === form.teacherId)?.name ?? "Unassigned",
      };
      return editing ? api.updateSubject(editing.id, payload) : api.createSubject(payload);
    },
    onSuccess: (subject) => {
      qc.setQueryData<Subject[]>(["subjects"], (old) =>
        editing
          ? (old ?? []).map((s) => (s.id === subject.id ? subject : s))
          : [subject, ...(old ?? [])],
      );
      toast.success(editing ? "Subject updated" : "Subject created");
      setOpen(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Save failed."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteSubject(id),
    onSuccess: (_r, id) => {
      qc.setQueryData<Subject[]>(["subjects"], (old) => (old ?? []).filter((s) => s.id !== id));
      toast.success("Subject deleted");
    },
  });

  function openCreate() {
    setEditing(null);
    setForm(empty);
    setError(null);
    setOpen(true);
  }
  function openEdit(s: Subject) {
    setEditing(s);
    setForm({
      code: s.code,
      name: s.name,
      section: s.section,
      teacherId: s.teacherId,
      schedule: s.schedule,
    });
    setError(null);
    setOpen(true);
  }

  return (
    <AppLayout
      title="Subjects & classes"
      subtitle="Create classes and assign teachers"
      requireAdmin
    >
      <div className="mb-4 flex justify-end">
        <Button onClick={openCreate}>
          <Plus className="size-4" /> New subject
        </Button>
      </div>

      {query.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      ) : query.isError ? (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertDescription>
            Couldn&apos;t load subjects.{" "}
            <button className="underline" onClick={() => query.refetch()}>
              Retry
            </button>
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {(query.data ?? []).map((s) => (
            <div key={s.id} className="surface p-5">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold">{s.name}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {s.code} · {s.section}
                  </p>
                </div>
                <Badge variant="secondary" className="shrink-0">
                  {s.studentCount}
                </Badge>
              </div>
              <p className="mt-3 truncate text-sm">
                <span className="text-muted-foreground">Teacher: </span>
                {s.teacherName}
              </p>
              <p className="truncate text-sm text-muted-foreground">{s.schedule}</p>
              <div className="mt-4 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => openEdit(s)}>
                  <Pencil className="size-4" /> Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => deleteMutation.mutate(s.id)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="size-4" /> Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit subject" : "New subject"}</DialogTitle>
          </DialogHeader>
          {error ? (
            <Alert variant="destructive">
              <AlertTriangle className="size-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="code">Course code</Label>
              <Input
                id="code"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="section">Section</Label>
              <Input
                id="section"
                value={form.section}
                onChange={(e) => setForm({ ...form, section: e.target.value })}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="sname">Subject name</Label>
              <Input
                id="sname"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Assigned teacher</Label>
              <Select
                value={form.teacherId}
                onValueChange={(v) => setForm({ ...form, teacherId: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="schedule">Schedule</Label>
              <Input
                id="schedule"
                placeholder="Mon/Wed 09:00"
                value={form.schedule}
                onChange={(e) => setForm({ ...form, schedule: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!form.name.trim() || !form.code.trim() || !form.section.trim()) {
                  setError("Course code, name and section are required.");
                  return;
                }
                saveMutation.mutate();
              }}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

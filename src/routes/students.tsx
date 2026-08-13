import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { AlertTriangle, Camera, ImagePlus, Loader2, Trash2, UploadCloud, X } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { api } from "@/lib/api";
import type { Student } from "@/lib/mock";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/students")({
  head: () => ({
    meta: [
      { title: "Student Enrollment — AttendAI" },
      {
        name: "description",
        content:
          "Enroll students with reference face photos and track face indexing status for recognition.",
      },
      { property: "og:title", content: "Student Enrollment — AttendAI" },
      { property: "og:description", content: "Add students and index reference face photos." },
    ],
  }),
  component: StudentsPage,
});

const statusMeta: Record<Student["enrollmentStatus"], { label: string; className: string }> = {
  indexed: { label: "Face indexed", className: "bg-success/15 text-success" },
  no_face: { label: "No face detected", className: "bg-destructive/15 text-destructive" },
  low_quality: { label: "Needs better photo", className: "bg-warning/20 text-warning" },
  pending: { label: "Pending indexing", className: "bg-muted text-muted-foreground" },
};

function StudentsPage() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [name, setName] = useState("");
  const [roll, setRoll] = useState("");
  const [subjects, setSubjects] = useState<string[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const subjectsQuery = useQuery({ queryKey: ["subjects"], queryFn: () => api.listSubjects() });
  const studentsQuery = useQuery({ queryKey: ["students"], queryFn: () => api.listStudents() });

  const createMutation = useMutation({
    mutationFn: () => api.createStudent({ name, roll, subjects, photos: photos.length }),
    onSuccess: (student) => {
      qc.setQueryData<Student[]>(["students"], (old) => [student, ...(old ?? [])]);
      toast.success(`${student.name} enrolled`);
      setName("");
      setRoll("");
      setSubjects([]);
      setPhotos([]);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Enrollment failed."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteStudent(id),
    onSuccess: (_r, id) => {
      qc.setQueryData<Student[]>(["students"], (old) => (old ?? []).filter((s) => s.id !== id));
      toast.success("Student removed");
    },
  });

  function addFiles(files: FileList | null) {
    if (!files) return;
    const accepted = [...files].filter((f) => f.type.startsWith("image/"));
    if (accepted.length !== files.length) toast.error("Only image files can be used as references.");
    accepted.slice(0, 3 - photos.length).forEach((f) => {
      const reader = new FileReader();
      reader.onload = () => setPhotos((p) => (p.length >= 3 ? p : [...p, String(reader.result)]));
      reader.onerror = () => toast.error(`Upload failed for ${f.name}`);
      reader.readAsDataURL(f);
    });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!name.trim() || !roll.trim()) return setFormError("Name and roll number are required.");
    if (subjects.length === 0) return setFormError("Select at least one subject.");
    if (photos.length < 2) return setFormError("Upload at least 2 reference face photos.");
    createMutation.mutate();
  }

  return (
    <AppLayout
      title="Student enrollment"
      subtitle="Register students and index their reference faces"
      requireAdmin
    >
      <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
        <form onSubmit={submit} className="surface h-fit p-5">
          <h2 className="text-sm font-semibold">Add a student</h2>
          {formError ? (
            <Alert variant="destructive" className="mt-4">
              <AlertTriangle className="size-4" />
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          ) : null}
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="roll">Roll number</Label>
              <Input id="roll" value={roll} onChange={(e) => setRoll(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Subjects enrolled</Label>
              <div className="space-y-1.5 rounded-lg border border-border p-3">
                {(subjectsQuery.data ?? []).map((s) => (
                  <label key={s.id} className="flex cursor-pointer items-center gap-2.5 text-sm">
                    <Checkbox
                      checked={subjects.includes(s.id)}
                      onCheckedChange={(v) =>
                        setSubjects((cur) =>
                          v ? [...cur, s.id] : cur.filter((x) => x !== s.id),
                        )
                      }
                    />
                    <span className="truncate">
                      {s.name} · {s.section}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Reference photos (2–3)</Label>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  addFiles(e.dataTransfer.files);
                }}
                className={`grid place-items-center rounded-lg border border-dashed p-6 text-center transition-colors ${
                  dragging ? "border-primary bg-accent/40" : "border-border"
                }`}
              >
                <UploadCloud className="size-6 text-muted-foreground" />
                <p className="mt-2 text-xs text-muted-foreground">
                  Drag &amp; drop photos here, or
                </p>
                <div className="mt-3 flex gap-2">
                  <Button type="button" size="sm" variant="secondary" onClick={() => fileRef.current?.click()}>
                    <ImagePlus className="size-4" /> Browse
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const input = document.createElement("input");
                      input.type = "file";
                      input.accept = "image/*";
                      input.capture = "user";
                      input.onchange = () => addFiles(input.files);
                      input.click();
                    }}
                  >
                    <Camera className="size-4" /> Camera
                  </Button>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  multiple
                  hidden
                  onChange={(e) => addFiles(e.target.files)}
                />
              </div>
              {photos.length ? (
                <div className="flex gap-2">
                  {photos.map((p, i) => (
                    <div key={i} className="relative size-16 overflow-hidden rounded-lg border border-border">
                      <img src={p} alt={`Reference ${i + 1}`} className="size-full object-cover" />
                      <button
                        type="button"
                        aria-label="Remove photo"
                        onClick={() => setPhotos((cur) => cur.filter((_, x) => x !== i))}
                        className="absolute right-0 top-0 grid size-5 place-items-center bg-background/90"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <Button type="submit" className="w-full" disabled={createMutation.isPending}>
              {createMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Enroll student
            </Button>
          </div>
        </form>

        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Enrolled students
          </h2>
          {studentsQuery.isLoading ? (
            <Skeleton className="h-96 rounded-xl" />
          ) : studentsQuery.isError ? (
            <Alert variant="destructive">
              <AlertTriangle className="size-4" />
              <AlertDescription>
                Couldn&apos;t load students.{" "}
                <button className="underline" onClick={() => studentsQuery.refetch()}>
                  Retry
                </button>
              </AlertDescription>
            </Alert>
          ) : (
            <div className="surface overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Roll</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Photos</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(studentsQuery.data ?? []).map((s) => {
                    const meta = statusMeta[s.enrollmentStatus];
                    return (
                      <TableRow key={s.id}>
                        <TableCell className="font-mono text-xs">{s.roll}</TableCell>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{s.photos}</TableCell>
                        <TableCell>
                          <Badge className={meta.className} variant="secondary">
                            {meta.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label={`Remove ${s.name}`}
                            onClick={() => deleteMutation.mutate(s.id)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

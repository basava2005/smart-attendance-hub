import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Loader2,
  RefreshCw,
  ScanFace,
  Send,
  UserX,
  VideoOff,
} from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/attendance")({
  validateSearch: (search: Record<string, unknown>): { subject?: string } =>
    typeof search["subject"] === "string" ? { subject: search["subject"] } : {},
  head: () => ({
    meta: [
      { title: "Take Attendance — AttendAI" },
      {
        name: "description",
        content:
          "Capture a classroom photo, review AI-recognized students and submit attendance in seconds.",
      },
      { property: "og:title", content: "Take Attendance — AttendAI" },
      {
        property: "og:description",
        content: "Photo capture, face recognition review and one-tap attendance submission.",
      },
    ],
  }),
  component: AttendancePage,
});

type Recognized = {
  studentId: string;
  name: string;
  roll: string;
  confidence: number;
  recognized: boolean;
};

function localDateTime() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function AttendancePage() {
  const { subject: subjectParam } = Route.useSearch();
  const { user } = useAuth();
  const subjectsQuery = useQuery({
    queryKey: ["subjects", user?.role, user?.id],
    queryFn: () => api.listSubjects(user?.role === "admin" ? undefined : { teacherId: user!.id }),
    enabled: Boolean(user),
  });

  const [subjectId, setSubjectId] = useState(subjectParam ?? "");
  const [sessionAt, setSessionAt] = useState(localDateTime());
  const [stage, setStage] = useState<"idle" | "live" | "captured" | "processing" | "review">("idle");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [students, setStudents] = useState<Recognized[]>([]);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [unknownFaces, setUnknownFaces] = useState<{ id: string; confidence: number }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!subjectId && subjectsQuery.data?.[0]) setSubjectId(subjectsQuery.data[0].id);
  }, [subjectsQuery.data, subjectId]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  async function startCamera() {
    setCameraError(null);
    setError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("unsupported");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 } },
        audio: false,
      });
      streamRef.current = stream;
      setStage("live");
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
      });
    } catch (err) {
      const name = (err as Error)?.name;
      setCameraError(
        name === "NotAllowedError"
          ? "Camera permission denied. Allow camera access in your browser settings, then try again."
          : name === "NotFoundError"
            ? "No camera was found on this device."
            : (err as Error).message === "unsupported"
              ? "Your browser doesn't support camera capture. Try Chrome or Safari over HTTPS."
              : "Couldn't start the camera. Close other apps using it and try again.",
      );
      setStage("idle");
    }
  }

  function capture() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
    setPhoto(canvas.toDataURL("image/jpeg", 0.9));
    stopCamera();
    setStage("captured");
  }

  function retake() {
    setPhoto(null);
    setStudents([]);
    setUnknownFaces([]);
    setError(null);
    void startCamera();
  }

  async function process() {
    if (!photo || !subjectId) return;
    setStage("processing");
    setError(null);
    try {
      const res = await api.recognize({ subjectId, sessionAt, image: photo });
      setStudents(res.recognized);
      setChecked(
        Object.fromEntries(res.recognized.map((s) => [s.studentId, s.recognized])) as Record<
          string,
          boolean
        >,
      );
      setUnknownFaces(res.unknownFaces.map((f) => ({ id: f.id, confidence: f.confidence })));
      setStage("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Face recognition failed.");
      setStage("captured");
    }
  }

  async function submit() {
    setSubmitting(true);
    try {
      const present = Object.entries(checked)
        .filter(([, v]) => v)
        .map(([k]) => k);
      const res = await api.submitAttendance({ subjectId, sessionAt, presentStudentIds: present });
      toast.success(`Attendance submitted — ${res.marked} students marked present`);
      setStage("idle");
      setPhoto(null);
      setStudents([]);
      setUnknownFaces([]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Submission failed. Please retry.");
    } finally {
      setSubmitting(false);
    }
  }

  const presentCount = Object.values(checked).filter(Boolean).length;

  return (
    <AppLayout title="Take attendance" subtitle="Capture the classroom and review the register">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-5">
          <div className="surface p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Subject / class</Label>
                {subjectsQuery.isLoading ? (
                  <Skeleton className="h-9 w-full" />
                ) : (
                  <Select value={subjectId} onValueChange={setSubjectId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {(subjectsQuery.data ?? []).map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} · {s.section}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="session">Session date &amp; time</Label>
                <Input
                  id="session"
                  type="datetime-local"
                  value={sessionAt}
                  onChange={(e) => setSessionAt(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="surface overflow-hidden">
            <div className="relative aspect-[4/3] w-full bg-muted">
              {stage === "live" ? (
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="size-full object-cover"
                  aria-label="Camera preview"
                />
              ) : photo ? (
                <img src={photo} alt="Captured classroom" className="size-full object-cover" />
              ) : (
                <div className="grid size-full place-items-center p-8 text-center">
                  <div>
                    <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-background text-muted-foreground">
                      <VideoOff className="size-6" />
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">
                      Camera is off. Start it to capture the class.
                    </p>
                  </div>
                </div>
              )}

              {stage === "processing" ? (
                <div className="absolute inset-0 grid place-items-center bg-background/80 backdrop-blur-sm">
                  <div className="text-center">
                    <Loader2 className="mx-auto size-7 animate-spin text-primary" />
                    <p className="mt-3 text-sm font-medium">Processing…</p>
                    <p className="text-xs text-muted-foreground">
                      Detecting and matching faces against the class roster
                    </p>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2 border-t border-border p-4">
              {stage === "idle" || cameraError ? (
                <Button onClick={startCamera} className="flex-1 sm:flex-none">
                  <Camera className="size-4" /> Start camera
                </Button>
              ) : null}
              {stage === "live" ? (
                <Button onClick={capture} className="flex-1 sm:flex-none">
                  <ScanFace className="size-4" /> Capture photo
                </Button>
              ) : null}
              {photo && stage !== "processing" ? (
                <>
                  <Button variant="outline" onClick={retake}>
                    <RefreshCw className="size-4" /> Retake
                  </Button>
                  {stage !== "review" ? (
                    <Button onClick={process} disabled={!subjectId}>
                      <ScanFace className="size-4" /> Recognize faces
                    </Button>
                  ) : null}
                </>
              ) : null}
            </div>
          </div>

          {cameraError ? (
            <Alert variant="destructive">
              <AlertTriangle className="size-4" />
              <AlertTitle>Camera unavailable</AlertTitle>
              <AlertDescription>{cameraError}</AlertDescription>
            </Alert>
          ) : null}
          {error ? (
            <Alert variant="destructive">
              <AlertTriangle className="size-4" />
              <AlertTitle>Recognition failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
        </div>

        <div className="space-y-5">
          <div className="surface p-5">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
              <h2 className="truncate text-sm font-semibold">Recognized students</h2>
              <Badge variant="secondary" className="shrink-0">
                {presentCount}/{students.length} present
              </Badge>
            </div>

            {stage === "review" && students.length ? (
              <>
                <div className="mt-4 max-h-[420px] space-y-1 overflow-y-auto pr-1">
                  {students.map((s) => (
                    <label
                      key={s.studentId}
                      className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-muted"
                    >
                      <Checkbox
                        checked={Boolean(checked[s.studentId])}
                        onCheckedChange={(v) =>
                          setChecked((c) => ({ ...c, [s.studentId]: Boolean(v) }))
                        }
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{s.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{s.roll}</p>
                      </div>
                      {s.recognized ? (
                        <span className="shrink-0 text-xs text-success">
                          {Math.round(s.confidence * 100)}%
                        </span>
                      ) : (
                        <span className="shrink-0 text-xs text-muted-foreground">not matched</span>
                      )}
                    </label>
                  ))}
                </div>

                {unknownFaces.length ? (
                  <Alert className="mt-4">
                    <UserX className="size-4" />
                    <AlertTitle>{unknownFaces.length} unrecognized faces</AlertTitle>
                    <AlertDescription>
                      Detected in the photo but not matched to any enrolled student. Flagged for
                      manual review.
                    </AlertDescription>
                  </Alert>
                ) : null}

                <Button className="mt-4 w-full" onClick={submit} disabled={submitting}>
                  {submitting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                  Submit attendance
                </Button>
              </>
            ) : (
              <div className="mt-6 grid place-items-center rounded-lg border border-dashed border-border p-8 text-center">
                <CheckCircle2 className="size-6 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Capture a photo and run recognition to build the register.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

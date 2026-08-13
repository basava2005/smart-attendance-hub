import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Camera, CalendarClock, Users, BookOpen, TrendingUp, AlertTriangle } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — AttendAI" },
      {
        name: "description",
        content: "Your assigned classes with one-tap access to AI face-recognition attendance.",
      },
      { property: "og:title", content: "Dashboard — AttendAI" },
      { property: "og:description", content: "Assigned classes and quick attendance capture." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { user } = useAuth();
  const subjectsQuery = useQuery({
    queryKey: ["subjects", user?.role, user?.id],
    queryFn: () => api.listSubjects(user?.role === "admin" ? undefined : { teacherId: user!.id }),
    enabled: Boolean(user),
  });
  const activityQuery = useQuery({ queryKey: ["activity"], queryFn: () => api.listActivity() });

  const subjects = subjectsQuery.data ?? [];
  const totalStudents = subjects.reduce((a, s) => a + s.studentCount, 0);

  return (
    <AppLayout
      title={`Welcome, ${user?.name.split(" ").slice(-1)[0] ?? ""}`}
      subtitle={new Date().toLocaleDateString(undefined, {
        weekday: "long",
        day: "numeric",
        month: "long",
      })}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={BookOpen} label="Classes" value={String(subjects.length)} />
        <StatCard icon={Users} label="Students" value={String(totalStudents)} />
        <StatCard icon={TrendingUp} label="Avg. attendance" value="86%" />
      </div>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Your classes
          </h2>
          <Button asChild size="sm" variant="secondary">
            <Link to="/attendance">
              <Camera className="size-4" /> New session
            </Link>
          </Button>
        </div>

        {subjectsQuery.isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-36 rounded-xl" />
            ))}
          </div>
        ) : subjectsQuery.isError ? (
          <Alert variant="destructive">
            <AlertTriangle className="size-4" />
            <AlertDescription>
              Couldn&apos;t load your classes.{" "}
              <button className="underline" onClick={() => subjectsQuery.refetch()}>
                Retry
              </button>
            </AlertDescription>
          </Alert>
        ) : subjects.length === 0 ? (
          <div className="surface p-8 text-center text-sm text-muted-foreground">
            No classes assigned yet.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {subjects.map((s) => (
              <div key={s.id} className="surface flex flex-col p-5">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold">{s.name}</p>
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">
                      {s.code} · {s.section}
                    </p>
                  </div>
                  <Badge variant="secondary" className="shrink-0">
                    {s.studentCount} students
                  </Badge>
                </div>
                <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <CalendarClock className="size-3.5" /> {s.schedule}
                </p>
                <Button asChild className="mt-4 w-full">
                  <Link to="/attendance" search={{ subject: s.id }}>
                    <Camera className="size-4" /> Take attendance
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Recent activity
        </h2>
        <div className="surface divide-y divide-border">
          {(activityQuery.data ?? []).slice(0, 4).map((e) => (
            <div key={e.id} className="flex items-start gap-3 p-4">
              <span
                className={`mt-1.5 size-2 shrink-0 rounded-full ${
                  e.type === "recognition_failed" ? "bg-warning" : "bg-success"
                }`}
              />
              <div className="min-w-0">
                <p className="text-sm">{e.message}</p>
                <p className="text-xs text-muted-foreground">
                  {e.subject ? `${e.subject} · ` : ""}
                  {new Date(e.at).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </AppLayout>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="surface flex items-center gap-4 p-5">
      <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
        <Icon className="size-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-xl font-semibold">{value}</p>
      </div>
    </div>
  );
}

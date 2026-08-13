import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, Server, UserPlus } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const Route = createFileRoute("/activity")({
  head: () => ({
    meta: [
      { title: "Activity Log — AttendAI" },
      {
        name: "description",
        content: "Recent attendance events, enrollment updates and failed face-recognition alerts.",
      },
      { property: "og:title", content: "Activity Log — AttendAI" },
      { property: "og:description", content: "Attendance events and recognition alerts." },
    ],
  }),
  component: ActivityPage,
});

const filters = [
  { id: "all", label: "All" },
  { id: "attendance", label: "Attendance" },
  { id: "recognition_failed", label: "Alerts" },
  { id: "enrollment", label: "Enrollment" },
] as const;

const icons = {
  attendance: CheckCircle2,
  recognition_failed: AlertTriangle,
  enrollment: UserPlus,
  system: Server,
};

function ActivityPage() {
  const [filter, setFilter] = useState<string>("all");
  const query = useQuery({ queryKey: ["activity"], queryFn: () => api.listActivity() });
  const events = (query.data ?? []).filter((e) => filter === "all" || e.type === filter);

  return (
    <AppLayout title="Notifications & activity" subtitle="Everything the system has recorded">
      <div className="mb-4 flex flex-wrap gap-2">
        {filters.map((f) => (
          <Button
            key={f.id}
            size="sm"
            variant={filter === f.id ? "default" : "outline"}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {query.isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : query.isError ? (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertDescription>
            Couldn&apos;t load the activity log.{" "}
            <button className="underline" onClick={() => query.refetch()}>
              Retry
            </button>
          </AlertDescription>
        </Alert>
      ) : events.length === 0 ? (
        <div className="surface grid place-items-center p-12 text-center">
          <Activity className="size-6 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">No events for this filter.</p>
        </div>
      ) : (
        <div className="surface divide-y divide-border">
          {events.map((e) => {
            const Icon = icons[e.type];
            const alert = e.type === "recognition_failed";
            return (
              <div key={e.id} className="flex items-start gap-4 p-4 sm:p-5">
                <div
                  className={`grid size-9 shrink-0 place-items-center rounded-xl ${
                    alert ? "bg-warning/20 text-warning" : "bg-accent text-accent-foreground"
                  }`}
                >
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{e.message}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {e.subject ? `${e.subject} · ` : ""}
                    {new Date(e.at).toLocaleString()}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
}

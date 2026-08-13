import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AttendAI — AI Face Recognition Attendance for Colleges" },
      {
        name: "description",
        content:
          "AttendAI marks college attendance from a single classroom photo using face recognition, with teacher review, reports and CSV export.",
      },
      { property: "og:title", content: "AttendAI — AI Attendance for Colleges" },
      {
        property: "og:description",
        content: "Photo-based face recognition attendance with teacher review and reports.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { user, ready } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!ready) return;
    navigate({ to: user ? "/dashboard" : "/login" });
  }, [ready, user, navigate]);

  return (
    <div className="grid min-h-screen place-items-center app-gradient">
      <div className="size-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
    </div>
  );
}

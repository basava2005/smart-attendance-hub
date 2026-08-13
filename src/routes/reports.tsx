import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { AlertTriangle, Download, Search } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Attendance Reports — AttendAI" },
      {
        name: "description",
        content:
          "Filter attendance by subject, date range and student, view percentage summaries and export CSV.",
      },
      { property: "og:title", content: "Attendance Reports — AttendAI" },
      { property: "og:description", content: "Attendance analytics with CSV export." },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const { user } = useAuth();
  const [subjectId, setSubjectId] = useState("all");
  const [from, setFrom] = useState("2026-08-01");
  const [to, setTo] = useState("2026-08-31");
  const [q, setQ] = useState("");

  const subjectsQuery = useQuery({
    queryKey: ["subjects", user?.role, user?.id],
    queryFn: () => api.listSubjects(user?.role === "admin" ? undefined : { teacherId: user!.id }),
    enabled: Boolean(user),
  });

  const recordsQuery = useQuery({
    queryKey: ["attendance", subjectId, from, to, q],
    queryFn: () => api.listAttendance({ subjectId, from, to, q }),
  });

  const records = useMemo(() => recordsQuery.data ?? [], [recordsQuery.data]);

  const summary = useMemo(() => {
    const map = new Map<string, { name: string; roll: string; present: number; total: number }>();
    for (const r of records) {
      const cur = map.get(r.studentId) ?? { name: r.studentName, roll: r.roll, present: 0, total: 0 };
      cur.total += 1;
      if (r.status === "present") cur.present += 1;
      map.set(r.studentId, cur);
    }
    return [...map.values()].sort((a, b) => a.roll.localeCompare(b.roll));
  }, [records]);

  const overall = records.length
    ? Math.round((records.filter((r) => r.status === "present").length / records.length) * 100)
    : 0;

  function exportCsv() {
    if (!records.length) {
      toast.error("Nothing to export for these filters.");
      return;
    }
    const rows = [
      ["Roll", "Student", "Subject", "Date", "Status", "Confidence"],
      ...records.map((r) => [
        r.roll,
        r.studentName,
        r.subjectName,
        r.date,
        r.status,
        r.confidence ? r.confidence.toFixed(2) : "",
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-${from}-to-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  }

  return (
    <AppLayout title="Attendance reports" subtitle="Filter, summarize and export attendance data">
      <div className="surface p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label>Subject</Label>
            <Select value={subjectId} onValueChange={setSubjectId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All subjects</SelectItem>
                {(subjectsQuery.data ?? []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} · {s.section}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="from">From</Label>
            <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="to">To</Label>
            <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="q">Student</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="q"
                className="pl-9"
                placeholder="Name or roll no."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-border pt-4">
          <p className="truncate text-sm text-muted-foreground">
            {records.length} records · {summary.length} students · overall{" "}
            <span className="font-semibold text-foreground">{overall}%</span>
          </p>
          <Button onClick={exportCsv} variant="secondary" className="shrink-0">
            <Download className="size-4" /> Export CSV
          </Button>
        </div>
      </div>

      {recordsQuery.isLoading ? (
        <Skeleton className="mt-6 h-72 rounded-xl" />
      ) : recordsQuery.isError ? (
        <Alert variant="destructive" className="mt-6">
          <AlertTriangle className="size-4" />
          <AlertDescription>
            Couldn&apos;t load attendance records.{" "}
            <button className="underline" onClick={() => recordsQuery.refetch()}>
              Retry
            </button>
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <section className="mt-6">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Summary per student
            </h2>
            <div className="surface overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Roll</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead className="text-right">Present</TableHead>
                    <TableHead className="text-right">Sessions</TableHead>
                    <TableHead className="text-right">%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.map((s) => {
                    const pct = Math.round((s.present / s.total) * 100);
                    return (
                      <TableRow key={s.roll}>
                        <TableCell className="font-mono text-xs">{s.roll}</TableCell>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell className="text-right">{s.present}</TableCell>
                        <TableCell className="text-right">{s.total}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={pct >= 75 ? "secondary" : "destructive"}>{pct}%</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {summary.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                        No records match these filters.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          </section>

          <section className="mt-8">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Records
            </h2>
            <div className="surface overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Confidence</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.slice(0, 60).map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap text-sm">{r.date}</TableCell>
                      <TableCell>
                        <span className="font-medium">{r.studentName}</span>
                        <span className="ml-2 font-mono text-xs text-muted-foreground">
                          {r.roll}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">{r.subjectName}</TableCell>
                      <TableCell>
                        <Badge variant={r.status === "present" ? "secondary" : "destructive"}>
                          {r.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {r.confidence ? `${Math.round(r.confidence * 100)}%` : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>
        </>
      )}
    </AppLayout>
  );
}

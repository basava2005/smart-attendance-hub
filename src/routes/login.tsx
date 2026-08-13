import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertCircle, Loader2, Moon, ScanFace, Sun } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — AttendAI Face Attendance" },
      {
        name: "description",
        content:
          "Sign in to AttendAI to take AI face-recognition attendance, manage classes and view reports.",
      },
      { property: "og:title", content: "Sign in — AttendAI Face Attendance" },
      {
        property: "og:description",
        content: "Teacher and Admin sign-in for the AI-driven college attendance system.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { login, user, ready } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (ready && user) navigate({ to: "/dashboard" });
  }, [ready, user, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const u = await login(email, password);
      navigate({ to: u.role === "admin" ? "/dashboard" : "/dashboard" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function quickFill(role: "teacher" | "admin") {
    setEmail(role === "admin" ? "admin@college.edu" : "teacher@college.edu");
    setPassword("password");
    setError(null);
  }

  return (
    <div className="grid min-h-screen app-gradient lg:grid-cols-2">
      <div className="hidden flex-col justify-between p-12 lg:flex">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground">
            <ScanFace className="size-6" />
          </div>
          <span className="text-lg font-semibold">AttendAI</span>
        </div>
        <div className="max-w-md">
          <h2 className="text-3xl font-semibold leading-tight">
            Classroom attendance in one photo.
          </h2>
          <p className="mt-4 text-muted-foreground">
            Capture the room, let face recognition mark the register, and correct anything the model
            missed before you submit.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-3">
            {[
              ["< 5s", "Per session"],
              ["98%", "Match rate"],
              ["0", "Roll calls"],
            ].map(([v, l]) => (
              <div key={l} className="surface p-4">
                <p className="text-xl font-semibold">{v}</p>
                <p className="text-xs text-muted-foreground">{l}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} AttendAI</p>
      </div>

      <div className="flex items-center justify-center p-5 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex items-center justify-between lg:hidden">
            <div className="flex items-center gap-2.5">
              <div className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
                <ScanFace className="size-5" />
              </div>
              <span className="font-semibold">AttendAI</span>
            </div>
            <Button variant="outline" size="icon" onClick={toggle} aria-label="Toggle theme">
              {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>
          </div>

          <div className="surface p-6 sm:p-8">
            <h1 className="text-xl font-semibold">Sign in</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Use your college account. Role is detected automatically.
            </p>

            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              {error ? (
                <Alert variant="destructive">
                  <AlertCircle className="size-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="you@college.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="size-4 animate-spin" /> : null}
                {loading ? "Signing in…" : "Sign in"}
              </Button>
            </form>

            <div className="mt-6 border-t border-border pt-4">
              <p className="text-xs text-muted-foreground">Demo accounts</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Button variant="secondary" size="sm" onClick={() => quickFill("teacher")}>
                  Teacher
                </Button>
                <Button variant="secondary" size="sm" onClick={() => quickFill("admin")}>
                  Admin / HOD
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

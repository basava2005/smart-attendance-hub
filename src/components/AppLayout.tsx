import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  BookOpen,
  Camera,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  ScanFace,
  Sun,
  UserPlus,
  FileBarChart,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["teacher", "admin"] },
  { to: "/attendance", label: "Take Attendance", icon: Camera, roles: ["teacher", "admin"] },
  { to: "/students", label: "Student Enrollment", icon: UserPlus, roles: ["admin"] },
  { to: "/subjects", label: "Subjects & Classes", icon: BookOpen, roles: ["admin"] },
  { to: "/reports", label: "Attendance Reports", icon: FileBarChart, roles: ["teacher", "admin"] },
  { to: "/activity", label: "Activity Log", icon: Activity, roles: ["teacher", "admin"] },
] as const;

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="flex flex-col gap-1">
      {nav
        .filter((i) => user && i.roles.includes(user.role as never))
        .map((item) => {
          const active = pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
              )}
            >
              <item.icon className="size-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
    </nav>
  );
}

function Brand() {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
        <ScanFace className="size-5" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold leading-tight">AttendAI</p>
        <p className="truncate text-xs text-muted-foreground">Face attendance</p>
      </div>
    </div>
  );
}

export function AppLayout({
  title,
  subtitle,
  children,
  requireAdmin,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  requireAdmin?: boolean;
}) {
  const { user, ready, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (ready && !user) navigate({ to: "/login" });
  }, [ready, user, navigate]);

  if (!ready || !user) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="size-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
      </div>
    );
  }

  if (requireAdmin && user.role !== "admin") {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-4 text-center">
        <div className="surface max-w-sm p-8">
          <h1 className="text-lg font-semibold">Admin access required</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This page is available to Admin / HOD accounts only.
          </p>
          <Button className="mt-5" onClick={() => navigate({ to: "/dashboard" })}>
            Back to dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen app-gradient">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar p-4 lg:flex">
        <Brand />
        <div className="mt-7 flex-1">
          <NavList />
        </div>
        <div className="rounded-xl bg-sidebar-accent/60 p-3">
          <p className="truncate text-sm font-medium">{user.name}</p>
          <p className="truncate text-xs capitalize text-muted-foreground">
            {user.role === "admin" ? "Admin / HOD" : "Teacher"}
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 w-full justify-start gap-2 px-2"
            onClick={() => {
              logout();
              navigate({ to: "/login" });
            }}
          >
            <LogOut className="size-4" /> Sign out
          </Button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
          <div className="mx-auto grid max-w-6xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:px-6">
            <div className="flex items-center gap-2 lg:hidden">
              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" aria-label="Open menu">
                    <Menu className="size-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 bg-sidebar p-4">
                  <SheetTitle className="sr-only">Navigation</SheetTitle>
                  <Brand />
                  <div className="mt-6">
                    <NavList onNavigate={() => setOpen(false)} />
                  </div>
                  <Button
                    variant="ghost"
                    className="mt-4 w-full justify-start gap-2"
                    onClick={() => {
                      logout();
                      navigate({ to: "/login" });
                    }}
                  >
                    <LogOut className="size-4" /> Sign out
                  </Button>
                </SheetContent>
              </Sheet>
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold sm:text-lg">{title}</h1>
              {subtitle ? (
                <p className="truncate text-xs text-muted-foreground sm:text-sm">{subtitle}</p>
              ) : null}
            </div>
            <Button variant="outline" size="icon" onClick={toggle} aria-label="Toggle theme">
              {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}

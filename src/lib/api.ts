/**
 * Central API layer. All backend calls go through here so the base URL can be
 * swapped between dev and a deployed Docker container via VITE_API_BASE_URL.
 *
 * Auth: JWT stored in localStorage, sent as `Authorization: Bearer <token>`.
 * If the backend is unreachable, calls fall back to demo data so the UI is
 * fully explorable before the API exists.
 */
import {
  mockActivity,
  mockAttendance,
  mockRecognition,
  mockStudents,
  mockSubjects,
  mockUsers,
  type ActivityEvent,
  type AttendanceRecord,
  type Student,
  type Subject,
  type User,
} from "./mock";

export const API_BASE_URL =
  (import.meta.env["VITE_API_BASE_URL"] as string | undefined)?.replace(/\/$/, "") ?? "";

export const endpoints = {
  login: "/api/auth/login",
  me: "/api/auth/me",
  logout: "/api/auth/logout",
  subjects: "/api/subjects",
  subject: (id: string) => `/api/subjects/${id}`,
  students: "/api/students",
  student: (id: string) => `/api/students/${id}`,
  studentPhotos: (id: string) => `/api/students/${id}/photos`,
  attendance: "/api/attendance",
  attendanceRecognize: "/api/attendance/recognize",
  attendanceSubmit: "/api/attendance/submit",
  attendanceExport: "/api/attendance/export",
  activity: "/api/activity",
  teachers: "/api/teachers",
};

const TOKEN_KEY = "ai_attendance_token";
const USER_KEY = "ai_attendance_user";

export function getToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}
export function setSession(token: string, user: User) {
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}
export function clearSession() {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}
export function getStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(USER_KEY);
  try {
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 0) {
    super(message);
    this.status = status;
  }
}

async function request<T>(
  path: string,
  options: RequestInit & { timeoutMs?: number } = {},
): Promise<T> {
  const { timeoutMs = 15000, ...init } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const token = getToken();
  const isForm = init.body instanceof FormData;
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        ...(isForm ? {} : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init.headers ?? {}),
      },
    });
    if (!res.ok) {
      let msg = `Request failed (${res.status})`;
      try {
        const body = (await res.json()) as { message?: string; error?: string };
        msg = body.message ?? body.error ?? msg;
      } catch {
        /* ignore */
      }
      throw new ApiError(msg, res.status);
    }
    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if ((err as Error).name === "AbortError")
      throw new ApiError("The request timed out. Check your connection and try again.", 408);
    throw new ApiError("Could not reach the server.", 0);
  } finally {
    clearTimeout(timer);
  }
}

/** Try the real API; on network/404 failures fall back to demo data. */
async function withFallback<T>(fn: () => Promise<T>, fallback: () => T | Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    const status = err instanceof ApiError ? err.status : 0;
    if (status === 0 || status === 404 || status === 408 || status >= 500) {
      await new Promise((r) => setTimeout(r, 350));
      return fallback();
    }
    throw err;
  }
}

export const api = {
  async login(email: string, password: string) {
    return withFallback(
      () =>
        request<{ token: string; user: User }>(endpoints.login, {
          method: "POST",
          body: JSON.stringify({ email, password }),
        }),
      () => {
        const found = mockUsers.find(
          (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password,
        );
        if (!found) throw new ApiError("Invalid email or password.", 401);
        const { password: _pw, ...user } = found;
        return { token: `demo.${btoa(user.id)}.token`, user };
      },
    );
  },

  listSubjects(params?: { teacherId?: string }) {
    const qs = params?.teacherId ? `?teacherId=${params.teacherId}` : "";
    return withFallback(
      () => request<Subject[]>(`${endpoints.subjects}${qs}`),
      () =>
        params?.teacherId
          ? mockSubjects.filter((s) => s.teacherId === params.teacherId)
          : mockSubjects,
    );
  },

  createSubject(data: Partial<Subject>) {
    return withFallback(
      () =>
        request<Subject>(endpoints.subjects, { method: "POST", body: JSON.stringify(data) }),
      () => ({
        id: `s${Date.now()}`,
        code: data.code ?? "",
        name: data.name ?? "",
        section: data.section ?? "",
        teacherId: data.teacherId ?? "u1",
        teacherName: data.teacherName ?? "Unassigned",
        studentCount: 0,
        schedule: data.schedule ?? "",
      }),
    );
  },

  updateSubject(id: string, data: Partial<Subject>) {
    return withFallback(
      () => request<Subject>(endpoints.subject(id), { method: "PUT", body: JSON.stringify(data) }),
      () => ({ ...(mockSubjects.find((s) => s.id === id) as Subject), ...data }),
    );
  },

  deleteSubject(id: string) {
    return withFallback(
      () => request<{ ok: true }>(endpoints.subject(id), { method: "DELETE" }),
      () => ({ ok: true }) as const,
    );
  },

  listStudents() {
    return withFallback(() => request<Student[]>(endpoints.students), () => mockStudents);
  },

  createStudent(data: { name: string; roll: string; subjects: string[]; photos: number }) {
    return withFallback(
      () => request<Student>(endpoints.students, { method: "POST", body: JSON.stringify(data) }),
      () => ({
        id: `st${Date.now()}`,
        name: data.name,
        roll: data.roll,
        subjects: data.subjects,
        photos: data.photos,
        enrollmentStatus: (data.photos >= 2 ? "indexed" : "low_quality") as Student["enrollmentStatus"],
      }),
    );
  },

  deleteStudent(id: string) {
    return withFallback(
      () => request<{ ok: true }>(endpoints.student(id), { method: "DELETE" }),
      () => ({ ok: true }) as const,
    );
  },

  recognize(payload: { subjectId: string; sessionAt: string; image: string }) {
    return withFallback(
      () =>
        request<ReturnType<typeof mockRecognition>>(endpoints.attendanceRecognize, {
          method: "POST",
          body: JSON.stringify(payload),
          timeoutMs: 30000,
        }),
      async () => {
        await new Promise((r) => setTimeout(r, 1400));
        return mockRecognition(payload.subjectId);
      },
    );
  },

  submitAttendance(payload: {
    subjectId: string;
    sessionAt: string;
    presentStudentIds: string[];
  }) {
    return withFallback(
      () =>
        request<{ ok: true; marked: number }>(endpoints.attendanceSubmit, {
          method: "POST",
          body: JSON.stringify(payload),
        }),
      () => ({ ok: true as const, marked: payload.presentStudentIds.length }),
    );
  },

  listAttendance(filters: { subjectId?: string; from?: string; to?: string; q?: string }) {
    const qs = new URLSearchParams(
      Object.entries(filters).filter(([, v]) => Boolean(v)) as [string, string][],
    ).toString();
    return withFallback(
      () => request<AttendanceRecord[]>(`${endpoints.attendance}?${qs}`),
      () =>
        mockAttendance.filter((r) => {
          if (filters.subjectId && filters.subjectId !== "all" && r.subjectId !== filters.subjectId)
            return false;
          if (filters.from && r.date < filters.from) return false;
          if (filters.to && r.date > filters.to) return false;
          if (filters.q) {
            const q = filters.q.toLowerCase();
            if (!r.studentName.toLowerCase().includes(q) && !r.roll.toLowerCase().includes(q))
              return false;
          }
          return true;
        }),
    );
  },

  listActivity() {
    return withFallback(() => request<ActivityEvent[]>(endpoints.activity), () => mockActivity);
  },
};

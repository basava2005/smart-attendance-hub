// Demo data used as a fallback when the backend API is unreachable.
// Swap VITE_API_BASE_URL to point at the real backend and this is bypassed.

export type Role = "teacher" | "admin";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface Subject {
  id: string;
  code: string;
  name: string;
  section: string;
  teacherId: string;
  teacherName: string;
  studentCount: number;
  schedule: string;
}

export interface Student {
  id: string;
  name: string;
  roll: string;
  subjects: string[];
  enrollmentStatus: "indexed" | "no_face" | "low_quality" | "pending";
  photos: number;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  roll: string;
  subjectId: string;
  subjectName: string;
  date: string;
  status: "present" | "absent";
  confidence?: number;
}

export interface ActivityEvent {
  id: string;
  type: "attendance" | "recognition_failed" | "enrollment" | "system";
  message: string;
  subject?: string;
  at: string;
}

export const mockUsers: (User & { password: string })[] = [
  {
    id: "u1",
    name: "Dr. Anita Rao",
    email: "teacher@college.edu",
    role: "teacher",
    password: "password",
  },
  {
    id: "u2",
    name: "Prof. S. Menon",
    email: "admin@college.edu",
    role: "admin",
    password: "password",
  },
];

export const mockSubjects: Subject[] = [
  {
    id: "s1",
    code: "CS301",
    name: "Data Structures",
    section: "CSE-A",
    teacherId: "u1",
    teacherName: "Dr. Anita Rao",
    studentCount: 62,
    schedule: "Mon/Wed 09:00",
  },
  {
    id: "s2",
    code: "CS305",
    name: "Operating Systems",
    section: "CSE-B",
    teacherId: "u1",
    teacherName: "Dr. Anita Rao",
    studentCount: 58,
    schedule: "Tue/Thu 11:00",
  },
  {
    id: "s3",
    code: "CS410",
    name: "Machine Learning",
    section: "CSE-A",
    teacherId: "u1",
    teacherName: "Dr. Anita Rao",
    studentCount: 45,
    schedule: "Fri 14:00",
  },
  {
    id: "s4",
    code: "EC220",
    name: "Digital Electronics",
    section: "ECE-A",
    teacherId: "u3",
    teacherName: "Dr. K. Iyer",
    studentCount: 70,
    schedule: "Mon 15:00",
  },
];

const firstNames = [
  "Aarav","Diya","Rohan","Meera","Kabir","Sana","Vikram","Ishita","Arjun","Neha",
  "Rahul","Priya","Karan","Tara","Nikhil","Anjali","Dev","Riya","Aditya","Sneha",
];
const lastNames = ["Sharma","Patel","Nair","Gupta","Reddy","Singh","Das","Joshi"];

export const mockStudents: Student[] = firstNames.map((f, i) => ({
  id: `st${i + 1}`,
  name: `${f} ${lastNames[i % lastNames.length]}`,
  roll: `21CS${String(i + 101).padStart(3, "0")}`,
  subjects: i % 3 === 0 ? ["s1", "s2"] : i % 3 === 1 ? ["s1", "s3"] : ["s2", "s3"],
  enrollmentStatus:
    i % 9 === 4 ? "no_face" : i % 7 === 3 ? "low_quality" : i % 11 === 6 ? "pending" : "indexed",
  photos: i % 9 === 4 ? 1 : 3,
}));

export const mockAttendance: AttendanceRecord[] = mockStudents.flatMap((s, i) =>
  ["2026-08-10", "2026-08-11", "2026-08-12"].map((date, d) => {
    const subjectId = s.subjects[0] ?? "s1";
    const absent = (i + d) % 5 === 0;
    return {
      id: `${s.id}-${d}`,
      studentId: s.id,
      studentName: s.name,
      roll: s.roll,
      subjectId,
      subjectName: mockSubjects.find((x) => x.id === subjectId)?.name ?? "",
      date,
      status: absent ? ("absent" as const) : ("present" as const),
      ...(absent ? {} : { confidence: 0.82 + ((i * 7 + d) % 17) / 100 }),
    };
  }),
);

export const mockActivity: ActivityEvent[] = [
  {
    id: "a1",
    type: "attendance",
    message: "Attendance submitted — 54/62 present",
    subject: "Data Structures (CSE-A)",
    at: "2026-08-12T09:12:00Z",
  },
  {
    id: "a2",
    type: "recognition_failed",
    message: "3 faces detected but not recognized — flagged for manual review",
    subject: "Data Structures (CSE-A)",
    at: "2026-08-12T09:11:20Z",
  },
  {
    id: "a3",
    type: "enrollment",
    message: "Kabir Reddy enrolled — face index failed, needs better photo",
    at: "2026-08-11T16:40:00Z",
  },
  {
    id: "a4",
    type: "attendance",
    message: "Attendance submitted — 49/58 present",
    subject: "Operating Systems (CSE-B)",
    at: "2026-08-11T11:05:00Z",
  },
  {
    id: "a5",
    type: "system",
    message: "Face index rebuilt for 240 students",
    at: "2026-08-10T22:00:00Z",
  },
  {
    id: "a6",
    type: "recognition_failed",
    message: "Low light — recognition confidence below threshold for 5 faces",
    subject: "Machine Learning (CSE-A)",
    at: "2026-08-10T14:22:00Z",
  },
];

export function mockRecognition(subjectId: string) {
  const roster = mockStudents.filter((s) => s.subjects.includes(subjectId)).slice(0, 12);
  return {
    recognized: roster.map((s, i) => ({
      studentId: s.id,
      name: s.name,
      roll: s.roll,
      confidence: 0.72 + ((i * 13) % 27) / 100,
      recognized: i % 6 !== 5,
    })),
    unknownFaces: [
      { id: "f1", box: "top-left", confidence: 0.41 },
      { id: "f2", box: "center", confidence: 0.33 },
    ],
  };
}

# Smart Attendance Hub

Build a web app frontend for an AI-Driven Attendance System for a college (React, 

clean modern UI). No native app — this is a responsive website that works on both 

desktop and mobile browsers.

USER ROLES:

1. Teacher

2. Admin/HOD

PAGES NEEDED:

1. Login page

   - Email + password login for Teacher and Admin (role-based)

2. Teacher Dashboard (landing page after login)

   - List of subjects/classes assigned to the teacher

   - Quick "Take Attendance" button per subject

3. Take Attendance page

   - Select subject + session (date/time auto-filled)

   - Open device camera (use getUserMedia) to capture a classroom photo

   - Show live camera preview, capture button, retake option

   - After capture, show "Processing..." state, then display recognized 

     students as a list with checkboxes (pre-checked if recognized, teacher 

     can manually correct before submitting) — also show any faces detected 

     but NOT recognized, flagged for manual review

   - Submit button to finalize attendance for that session

4. Student Enrollment page (Admin only)

   - Form to add a new student: name, roll number, subject(s) enrolled in, 

     upload 2-3 reference face photos (drag & drop or camera capture)

   - Show enrollment status per student (face indexed successfully / no 

     face detected / needs better photo)

5. Subject/Class Management page (Admin only)

   - CRUD for subjects, class sections, assigning teachers to subjects

6. Attendance Reports page

   - Filter by subject, date range, student

   - Table view of attendance records with status (present/absent), 

     percentage summary per student

   - Export to CSV button

7. Notifications/Activity log page

   - Recent attendance-marking events, any failed recognition alerts

DESIGN:

- Clean, modern, minimal — card-based layouts, soft shadows, rounded corners

- Mobile-first for the "Take Attendance" flow since teachers will often use 

  phones in class

- Use a calm color palette (blues/greens), avoid clutter

- Loading states and clear error messages everywhere (camera permission 

  denied, upload failed, no face detected, network timeout, etc.)

TECHNICAL NOTES:

- This frontend will call a separate backend REST API (base URL to be 

  configured via env variable) — build all data fetching against placeholder 

  endpoints like /api/attendance, /api/students, /api/subjects, /api/auth/login

- Use JWT stored in localStorage/cookies for auth state, attach as 

  Authorization: Bearer <token> header on all authenticated requests

- Structure API calls so backend URL can be swapped later (dev vs deployed 

  Docker container)   add all end points for backend and so i need proffestional ui with both dark and white theme

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/ede27dc0-28b8-474f-aa5e-237408a0aac3).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

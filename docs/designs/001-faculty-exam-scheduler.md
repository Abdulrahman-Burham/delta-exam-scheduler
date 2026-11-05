# 001 - Automated Faculty Exam Invigilation Management System

## Status
`Approved & Implemented (Audited & Hardened under EGM Standard)`

---

## 1. Heilmeier Catechism

### Objectives
What is being attempted? (No jargon)
Automate the assignment of faculty professors, lecturers, and teaching assistants to exam halls and computer laboratories across midterm and final examination sessions. The system eliminates human scheduling errors, prevents double-booking, enforces safety supervisor-to-student ratios, guarantees equitable distribution of proctoring hours, and minimizes back-to-back shift fatigue.

### State of the Art & Current Practice Limits
How is it done today, and what are the limits of current practice?
Faculty examination committees rely on manual Microsoft Excel spreadsheets.
* **Double-Booking Risks**: Human coordinators inadvertently schedule invigilators for simultaneous sessions in different venues.
* **Workload Inequity**: Shifts are unevenly assigned—some junior teaching assistants receive 12+ shifts while others receive only 2–3 shifts, creating dissatisfaction and disputes.
* **Severe Transit Fatigue**: Staff are assigned across distant campus buildings (e.g., Computer Labs to Physical Therapy Hall) in adjacent periods with no transition margin.
* **High Turn-Around Friction**: Modifying a schedule due to faculty illness or timetable changes requires several days of error-prone manual cross-referencing.

### New Approach
What is new in the approach, and why is it expected to be successful?
We formulate invigilation scheduling as an exact **Constraint Satisfaction Problem (CSP)** solved using **Google OR-Tools CP-SAT**:
* **Exact Hard Constraints**: Strictly enforceable integer constraints for zero overlaps, blackout avoidance, and student-to-proctor ratios.
* **Multi-Objective Soft Optimization**: Mathematical minimization of workload variance ($\sigma^2$), consecutive shifts without rest, and cross-building transit.
* **Deterministic Relaxation & Fallback**: A multi-tiered relaxation algorithm and greedy bipartite fallback guaranteeing complete schedule delivery even under severe staff deficits.

### Impact
Who cares? If successful, what difference will it make?
* **Dean & Exam Leadership (Delta University AI Faculty)**: Instant conflict-free schedule generation in $< 3.5\text{ seconds}$ vs. 4 business days of manual work.
* **Teaching Assistants & Faculty Staff (64 members)**: Fair, balanced workload distribution with guaranteed rest breaks.
* **Examination Integrity**: 100% room supervision coverage across all 471 exam sessions with zero unstaffed rooms.

### Risks & Payoffs
* **Staff Deficit Infeasibility**: High blackout requests during peak multi-room exam sessions.
  * **Mitigation**: 4-tier deterministic constraint relaxation ending in a greedy bipartite matcher that flags specific unstaffed sessions in the admin audit log.
* **Arabic Glyph Rendering in Official Documents**: ReportLab's standard Helvetica drops Arabic names in faculty rosters.
  * **Mitigation**: Server-side dynamic Unicode TrueType font registration (Arial / DejaVu) paired with XML escaping and Latin fallback sanitization.
* **Last-Minute Absence**:
  * **Mitigation**: Admin override interface with live collision detection and optimistic schedule locking.

### Cost & Resource Footprint
* **Compute Footprint**: $1.2–3.5\text{ seconds}$ CPU runtime on standard 2-core machines for 471 exam sessions across 64 faculty members.
* **Infrastructure**: Minimal footprint ($< 512\text{ MB}$ total RAM) spanning FastAPI, Next.js, and PostgreSQL containers.

### Timeline & Milestones
* **Phase 1 (Done)**: Domain models, Alembic migrations, and Delta University dataset ingestion (66 staff, 33 venues, 471 exam sessions).
* **Phase 2 (Done)**: Google OR-Tools CP-SAT scheduler, objective penalty weighting, and greedy bipartite fallback.
* **Phase 3 (Done)**: FastAPI REST endpoints, JWT authentication, RBAC, and demo persona switching.
* **Phase 4 (Done)**: Next.js 14 and Vite responsive dashboards (`/admin`, `/professor`, `/ta`).
* **Phase 5 (Done)**: Master landscape A4 PDF export, individual duty slips, CSV, and RFC 5545 iCalendar (`.ics`).

### Metrics & Validation
* **Feasibility**: 0 hard constraint collisions (double-bookings $= 0$, blackout duty violations $= 0$).
* **Fairness & Coverage**: Coverage rate $\ge 90\%$, fairness index $> 85\%$, workload variance $\sigma^2 \le 0.5$ shifts per TA.

---

## 2. Feature Specification & System Architecture

### Problem Statement
The Faculty of Artificial Intelligence at Delta University for Science & Technology administers 471 exam room sessions across 10 consecutive days and 33 venues. Distributing 64 academic staff across these demands manual coordination that is prone to scheduling collisions, unfair workload distribution, and high administrative friction.

### Goals & Non-Goals
* **Goals**:
  * Ingest complete academic staff rosters, venue capacities, and exam session timetables.
  * Execute mathematical optimization using Google OR-Tools CP-SAT with configurable objective weights.
  * Provide three distinct web dashboards for Dean/Admin, Professors, and Teaching Assistants.
  * Export landscape A4 Master Schedules, personal duty slips with signature blocks, and `.ics` calendars.
* **Non-Goals**:
  * Automatic student desk seating allocation (managed by student affairs).
  * Biometric hardware attendance gates.

### System Architecture Flowchart

```mermaid
flowchart TD
    subgraph ClientLayer ["Client Layer (Next.js 14 / Vite React)"]
        AdminDashboard["Admin Command Center (/admin)"]
        ProfDashboard["Professor Oversight Portal (/professor)"]
        TADashboard["Teaching Assistant Portal (/ta)"]
    end

    subgraph APILayer ["FastAPI REST Service"]
        AuthRouter["/api/auth (Login & Demo Switcher)"]
        UserRouter["/api/users (Staff Roster & Limits)"]
        VenueRouter["/api/venues (Halls & Labs)"]
        ExamRouter["/api/exams (Sessions & Slots)"]
        SchedRouter["/api/schedules (Generate & Overrides)"]
        ExportRouter["/api/exports (PDF, CSV, ICS)"]
        AnalyticsRouter["/api/analytics (Equity & Fairness)"]
    end

    subgraph OptimizationCore ["AI Scheduling Engine"]
        CPSAT["Google OR-Tools CP-SAT Solver"]
        RelaxationEngine["Deterministic Relaxation Hierarchy"]
        FallbackMatcher["Greedy Bipartite Fallback Matcher"]
    end

    subgraph StorageLayer ["Persistence Layer"]
        DB[(PostgreSQL / SQLite)]
    end

    ClientLayer -->|Bearer JWT| APILayer
    SchedRouter --> OptimizationCore
    APILayer --> StorageLayer
    OptimizationCore -->|Read Rosters & Write Assignments| StorageLayer
```

### Relational Database Schema & Field Definitions

```sql
-- 1. Users Table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    staff_id VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(120) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'TA', -- ADMIN | PROFESSOR | TA
    department VARCHAR(100) NOT NULL,
    title VARCHAR(100),                     -- e.g. Dean of Faculty, Assistant Lecturer
    phone VARCHAR(30),
    max_daily_shifts INT NOT NULL DEFAULT 2,
    max_total_shifts INT NOT NULL DEFAULT 6,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Venues Table
CREATE TABLE venues (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,             -- e.g. Lab 1, PT Hall, Hall M1
    venue_type VARCHAR(20) NOT NULL,        -- HALL | LAB
    building VARCHAR(50) NOT NULL,          -- Main AI, Engineering, Pharmacy
    floor INT NOT NULL DEFAULT 1,
    capacity INT NOT NULL DEFAULT 40,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Exam Sessions Table
CREATE TABLE exam_sessions (
    id SERIAL PRIMARY KEY,
    course_code VARCHAR(50) NOT NULL,
    course_name VARCHAR(150) NOT NULL,
    department VARCHAR(100) NOT NULL,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    student_headcount INT NOT NULL DEFAULT 30,
    venue_id INT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    required_professors INT NOT NULL DEFAULT 1,
    required_tas INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. Availability Constraints (Blackouts & Preferences)
CREATE TABLE availability_constraints (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    constraint_type VARCHAR(20) NOT NULL,   -- UNAVAILABLE | PREFER_NOT
    reason VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. Schedule Runs Table
CREATE TABLE schedule_runs (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(30) NOT NULL,            -- OPTIMAL | FEASIBLE | FALLBACK_HEURISTIC | FAILED
    total_assignments INT NOT NULL DEFAULT 0,
    metrics JSON,                           -- coverage_rate, fairness_index, variance
    config_applied JSON,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- 6. Schedule Assignments Table
CREATE TABLE schedule_assignments (
    id SERIAL PRIMARY KEY,
    schedule_run_id INT NOT NULL REFERENCES schedule_runs(id) ON DELETE CASCADE,
    exam_session_id INT NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_in_exam VARCHAR(30) NOT NULL,      -- LEAD_PROFESSOR | INVIGILATOR_TA
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    is_manual_override BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_assignment UNIQUE (schedule_run_id, exam_session_id, user_id)
);
```

### Complete REST API Contracts

| Method | Endpoint Path | Auth / Role | Request Payload | Response Schema | Status Codes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Public | `{email, password}` | `{access_token, token_type, role, user_id, full_name}` | 200, 401 |
| `POST` | `/api/auth/switch-demo-user` | Public | `{role}` | `{access_token, token_type, role, user_id, full_name}` | 200, 400 |
| `GET` | `/api/users/me` | Bearer Any | None | `UserOut` | 200, 401 |
| `GET` | `/api/users` | Bearer Admin | Query: `role`, `department` | `List[UserOut]` | 200, 401, 403 |
| `POST` | `/api/users` | Bearer Admin | `UserCreate` | `UserOut` | 201, 400 |
| `GET` | `/api/venues` | Bearer Any | None | `List[VenueOut]` | 200, 401 |
| `GET` | `/api/exams` | Bearer Any | Query: `date`, `department` | `List[ExamSessionOut]` | 200, 401 |
| `POST` | `/api/schedules/generate` | Bearer Admin | `ScheduleRunConfig` (weights) | `ScheduleRunOut` | 200, 400, 500 |
| `GET` | `/api/schedules/matrix` | Bearer Any | None | `MatrixResponse` (dates, slots, cells) | 200, 401 |
| `POST` | `/api/schedules/assignments/{id}/lock` | Bearer Admin | None | `ScheduleAssignmentOut` | 200, 404 |
| `POST` | `/api/schedules/assignments/override` | Bearer Admin | `AssignmentOverrideRequest` | `ScheduleAssignmentOut` | 200, 400, 409 |
| `GET` | `/api/exports/pdf/master` | Bearer Any | None | `application/pdf` binary | 200, 404 |
| `GET` | `/api/exports/pdf/personal/{user_id}`| Bearer Any | None | `application/pdf` binary | 200, 404 |
| `GET` | `/api/exports/ics/{user_id}` | Bearer Any | None | `text/calendar` iCal file | 200, 404 |
| `GET` | `/api/exports/csv` | Bearer Any | None | `text/csv` spreadsheet export | 200, 404 |
| `GET` | `/api/analytics/summary` | Bearer Any | None | `AnalyticsSummary` (fairness, coverage) | 200 |

### Mathematical Formulation & Solver Objective Weights

$$\text{Objective} = \min \left( W_{\text{fairness}} \cdot \sum_{t \in \text{TAs}} \text{dev}_t + W_{\text{rest}} \cdot \sum \text{consec\_penalties} + W_{\text{commute}} \cdot \sum \text{building\_changes} + W_{\text{dept}} \cdot \sum \text{dept\_mismatches} \right)$$

* **$W_{\text{fairness}} = 60$**: Equalizes shift counts across staff of the same tier.
* **$W_{\text{rest}} = 40$**: Minimizes back-to-back shifts on the same day without rest.
* **$W_{\text{commute}} = 30$**: Penalizes assigning the same invigilator to different buildings within the same day.
* **$W_{\text{dept}} = 50$**: Encourages matching faculty to exams in their home department.

### Deterministic Constraint Relaxation Hierarchy & Shortfall Handling
When the CP-SAT solver reports `INFEASIBLE` due to staff deficits:
1. **Tier 1 (Proximity)**: Relax building proximity penalties ($W_{\text{commute}} = 0$).
2. **Tier 2 (Department)**: Relax department matching ($W_{\text{dept}} = 0$).
3. **Tier 3 (Rest Intervals)**: Relax consecutive shift penalties, allowing adjacent shifts up to `max_daily_shifts`.
4. **Tier 4 (Fallback Matcher)**: Run greedy bipartite matching prioritized by student headcount. Any unfilled slots are logged in `ScheduleRun.metrics.unstaffed_sessions` and persisted with status `FALLBACK_HEURISTIC` so administrators receive clear shortfall alerts.

### Documented Alternatives & Architectural Trade-offs
* **Synchronous vs. Asynchronous Scheduling Execution**:
  * *Decision*: Synchronous FastAPI endpoint with a 30s timeout for the faculty-level schedule (471 sessions, 64 staff, solving time $1.2–3.5\text{ seconds}$).
  * *Trade-off*: Immediate response for Dean/Admin without needing Redis/Celery queue infrastructure. Multi-campus scale ($> 5000$ sessions) will migrate to `BackgroundTasks` or Redis task queues.
* **Frontend Hybrid Configuration**:
  * *Decision*: Next.js 14 App Router for production routing (`/admin`, `/professor`, `/ta`) with Vite integration for lightning-fast sub-second client hot-reloading.
  * *Action*: Pruned unused `html2canvas` dependency; PDF rendering is strictly performed by the backend ReportLab vector engine.

---

## 3. Implementation Readiness Specification

### Complete Repository File Manifest

```text
backend/
├── app/
│   ├── api/
│   │   ├── deps.py              # Auth token validation and DB session injection
│   │   ├── auth.py              # Login and demo switcher endpoints
│   │   ├── users.py             # User CRUD and profile routes
│   │   ├── venues.py            # Venue list and capacity routes
│   │   ├── exams.py             # Exam session query routes
│   │   ├── schedules.py         # Solver execution and assignment lock/override
│   │   ├── exports.py           # ReportLab PDF, CSV, and ICS download routes
│   │   └── analytics.py         # Workload equity and distribution analytics
│   ├── models/
│   │   ├── __init__.py          # Export all models
│   │   ├── user.py              # User entity and RoleEnum
│   │   ├── venue.py             # Venue entity and VenueTypeEnum
│   │   ├── exam.py              # ExamSession entity
│   │   ├── assignment.py        # ScheduleRun, ScheduleAssignment, AssignmentRoleEnum
│   │   └── constraint.py        # AvailabilityConstraint entity
│   ├── schemas/
│   │   ├── auth.py              # Token and Login DTOs
│   │   ├── user.py              # UserCreate, UserOut DTOs
│   │   ├── venue.py             # VenueOut DTO
│   │   ├── exam.py              # ExamSessionOut DTO
│   │   ├── schedule.py          # ScheduleRunConfig, ScheduleAssignmentOut, MatrixResponse
│   │   └── constraint.py        # AvailabilityConstraintOut DTO
│   ├── services/
│   │   ├── auth_service.py      # Password hashing and JWT generation
│   │   ├── optimizer.py         # Google OR-Tools CP-SAT scheduler & fallback heuristic
│   │   ├── export_service.py    # ReportLab PDF and RFC 5545 iCal generator
│   │   └── seed_service.py      # Delta University official timetable and roster
│   ├── config.py                # Pydantic v2 application settings
│   ├── database.py              # SQLAlchemy engine and Base
│   └── main.py                  # FastAPI application entrypoint
frontend/
├── src/
│   ├── app/
│   │   ├── admin/page.tsx       # Dean / Exam Committee Lead command center
│   │   ├── professor/page.tsx   # Professor oversight portal
│   │   ├── ta/page.tsx          # Teaching Assistant duty calendar and slips
│   │   ├── page.tsx             # Role-based landing portal
│   │   └── layout.tsx           # Global HTML layout and metadata
│   ├── components/
│   │   ├── Navbar.tsx           # Role selector and navigation header
│   │   ├── AdminDashboard.tsx   # Matrix schedule grid and solver controls
│   │   ├── ProfessorDashboard.tsx # Course supervision session list
│   │   ├── TADashboard.tsx      # Personal duty cards and export triggers
│   │   ├── OverrideModal.tsx    # Manual proctor swap modal
│   │   ├── ConstraintModal.tsx  # Blackout request modal
│   │   └── ui/                  # Shadcn card, button, and badge primitives
│   ├── services/
│   │   └── api.ts               # Axios/Fetch client with auth interceptors
│   ├── types/
│   │   └── index.ts             # TypeScript interfaces mirroring backend schemas
│   └── lib/
│       └── utils.ts             # Tailwind class merging utility
docker-compose.yml               # Multi-container orchestration (FastAPI, Next.js, Postgres)
```

### Verification & Automated Testing Plan
* `backend/tests/test_optimizer.py`:
  * `test_optimizer_basic_hard_constraints`: Verifies zero double-booking across concurrent sessions and validates blackout avoidance.
  * `test_optimizer_workload_balance`: Verifies equal distribution of duties across staff of the same tier.
* `backend/tests/test_api_and_services.py`:
  * `test_auth_login_and_token`: Validates JWT creation and role extraction.
  * `test_auth_demo_switcher`: Validates instant persona switching for Dean, Professor, and TA.
  * `test_schedule_generation_and_matrix_api`: Verifies full solve across Delta University timetable with coverage rate $\ge 80\%$ and fairness index $> 70\%$.
  * `test_document_exports`: Validates `%PDF-1.4` binary stream generation and RFC 5545 `BEGIN:VCALENDAR` syntax.

# ExamSync AI — Faculty Exam Invigilation Management System
### Intelligent Multi-Role Faculty Timetabling & AI Constraint Satisfaction Engine

ExamSync AI is an enterprise-grade automated exam scheduling and invigilation allocation platform engineered for university faculties (Engineering, Computing, and Artificial Intelligence). It automates the complex, error-prone task of assigning **Professors / Doctors (Lead Supervisors)** and **Teaching Assistants (Room Invigilators)** across exam halls and specialized computer laboratories.

The core scheduling engine leverages **Google OR-Tools CP-SAT (Constraint Programming - Satisfiability)** to guarantee **conflict-free, mathematically optimal allocations** while balancing workloads, respecting individual blackout constraints, minimizing back-to-back shift exhaustion, and optimizing campus building proximity.

---

## 🏛️ System Architecture & Tech Stack

```
                          ┌─────────────────────────────────────┐
                          │     React + Tailwind CSS Client     │
                          │   (Admin, Professor, TA Portals)    │
                          │     RTL Arabic & English UI         │
                          └──────────────────┬──────────────────┘
                                             │ HTTP / SameSite Cookies
                                             ▼
                          ┌─────────────────────────────────────┐
                          │          FastAPI Backend            │
                          │   (Clean Architecture + Strict RBAC)│
                          └───────┬──────────┬──────────┬───────┘
                                  │          │          │
                     ┌────────────┴───┐      │     ┌────┴────────────┐
                     │ Google OR-Tools│      │     │  ReportLab PDF  │
                     │  CP-SAT Engine │      │     │  & iCal Engine  │
                     └────────────────┘      │     └─────────────────┘
                                             ▼
                               ┌───────────────────────────┐
                               │   PostgreSQL / SQLite     │
                               │      SQLAlchemy ORM       │
                               └───────────────────────────┘
```

- **Backend Framework**: Python 3.11, FastAPI, SQLAlchemy 2.0, Alembic, Pydantic v2.
- **Security & RBAC**: Passlib Bcrypt (work factor 12), PyJWT (HS256 short-lived access tokens), SlowAPI rate limiting (5 req/min on login), HttpOnly SameSite=Lax cookie transport, timing-attack resistance.
- **Optimization Engine**: Google OR-Tools CP-SAT solver with heuristic bipartite matching fallback.
- **Document & Export Services**: ReportLab (official landscape Master PDF & individual slips), `html2canvas` (PNG snapshots), CSV raw dataset export, iCalendar (`.ics`).
- **Frontend Framework**: React 18 / Next.js Edge patterns, TypeScript, Tailwind CSS, Lucide React, Vite.
- **Containerization & DB**: Docker, Docker Compose, PostgreSQL 16 Alpine, Redis 7 Alpine.

---

## 🔐 Enterprise Security & Role-Based Access Control (RBAC)

The platform enforces strict role-based isolation across three primary actor tiers:

| Role | Access Scope | Protected Endpoints | Default Route |
|---|---|---|---|
| **ADMIN** | Full administrative rights, AI solver configuration, master timetable modifications, faculty management, document generation | `/api/admin/*`, `/api/schedule/*`, `/api/exports/*` | `/admin/dashboard` |
| **DOCTOR** | Lead course oversight, view assigned exam halls, view allocated room TAs, export personal supervision slips | `/api/doctor/*`, `/api/exports/pdf/personal/{id}` | `/doctor/dashboard` |
| **TA** | Room invigilation timetable, personal workload metrics, blackout submission, export personal duty slip & calendar | `/api/ta/*`, `/api/exports/pdf/personal/{id}` | `/ta/dashboard` |

### Security Hardening Measures
1. **Password Hashing**: Standardized on Bcrypt with 12 rounds of salt stretching.
2. **Side-Channel Timing Defense**: Rejection paths execute constant-time dummy verification hashes to defeat user enumeration attacks.
3. **Session Transport**: Access tokens are dispatched via `HttpOnly`, `SameSite=Lax`, `Path=/` secure cookies, eliminating XSS token theft vectors.
4. **Brute-Force Rate Limiting**: Powered by SlowAPI (maximum 5 attempts per minute per IP on authentication endpoints).
5. **CORS Governance**: Whitelisted exact origin domains with `allow_credentials=True` (wildcard origins explicitly forbidden).

---

## 🔑 Default Seeded Test Credentials

The database is pre-seeded with verified test accounts across all roles:

| Role | Email Address | Password | Permissions |
|---|---|---|---|
| **System Admin** | `admin@faculty.edu` | `AdminPass123!` | Committee Lead / Dean / Full System Control |
| **Doctor / Professor** | `doctor@faculty.edu` | `DoctorPass123!` | Lead Supervisor Portal |
| **Teaching Assistant** | `ta@faculty.edu` | `TAPass123!` | Hall Invigilator Portal |

---

## 🧠 Optimization & AI Engine Specification

### 1. Hard Constraints (Zero-Violation Mathematical Guarantees)
1. **Zero Double-Booking / Overlap Immunity**:
   $$\forall u \in \text{Staff}, \; \forall s_1, s_2 \in \text{Sessions} \text{ such that } \text{Overlap}(s_1, s_2): \quad x_{u, s_1} + x_{u, s_2} \le 1$$
2. **Venue Demand Satisfaction**:
   - Each examination hall receives exactly its required Lead Supervisor count ($\sum_{p} x_{p, s} = \text{req\_profs}_s$).
   - Hall/Lab headcount determines invigilator TA demand:
     $$\sum_{t} x_{t, s} = \text{req\_tas}_s \quad (\ge 2 \text{ for labs, } 3\text{--}4 \text{ for large lecture halls})$$
3. **Availability Blackout Compliance**:
   - If staff member $u$ registers a verified leave or master's study day covering session $s$:
     $$x_{u, s} = 0$$
4. **Workload Limits**:
   - Daily cap: $\sum_{s \in \text{Day}} x_{u, s} \le \text{max\_daily\_shifts}_u$ (Default: $\le 2$ shifts/day).
   - Weekly cap: $\sum_{s} x_{u, s} \le \text{max\_total\_shifts}_u$ (Default: $\le 6$ shifts/week).
5. **Locked Assignment Preservation**:
   - Manually locked entries remain fixed during subsequent solver executions ($x_{u, s} = 1$).

### 2. Soft Constraints & Multi-Objective Target Function
$$\min \left( W_{\text{balance}} \cdot \sum_u | \text{shifts}_u - \bar{S} | \;+\; W_{\text{rest}} \cdot \sum \text{ConsecutiveShifts} \;+\; W_{\text{prox}} \cdot \sum \text{CrossBuildingShifts} \;+\; W_{\text{dept}} \cdot \sum \text{NonDeptMatches} \right)$$

- **Workload Balance**: Minimizes shift variance across staff for 100% fair duty distribution.
- **Rest Interval**: Penalizes exhausting back-to-back shifts on the same day.
- **Building Proximity**: Minimizes cross-campus transit between distant examination blocks.
- **Department Affinity**: Prioritizes assigning course department specialists to handle subject questions.

---

## 🚀 Quickstart Guide

### Option A: Local Development

#### 1. Backend Service
```bash
cd backend
python -m pip install -r requirements.txt email-validator psycopg2-binary
alembic upgrade head
python seed_auth_users.py
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
- **API Documentation (Swagger UI)**: `http://localhost:8000/docs`
- **ReDoc Interactive Reference**: `http://localhost:8000/redoc`

#### 2. Frontend Client
```bash
cd frontend
npm install
npm run dev
```
- Open `http://localhost:3000` (or `http://localhost:5173`) in your browser.
- Switch between Arabic RTL and English dynamically with the locale toggle.

---

### Option B: Production Container Deployment (Docker Compose)

Launch the isolated multi-container stack (Frontend, Backend, PostgreSQL, Redis, Worker):
```bash
docker compose up -d --build
```

To stop and remove containers cleanly:
```bash
docker compose down -v
```

Container endpoints:
- **Frontend Dashboard**: `http://localhost:3000`
- **FastAPI Core & Swagger**: `http://localhost:8000/docs`
- **PostgreSQL Database**: `localhost:5432`
- **Redis Cache**: `localhost:6379`

---

## 🧪 Automated Testing Suite (PyTest)

The test suite covers cryptographic security, RBAC enforcement, CRUD operations, AI optimization, and export pipelines:

```bash
# Run the entire test suite
python -c "import sys; sys.path.insert(0, 'backend'); import pytest; sys.exit(pytest.main(['backend/tests/', '-v']))"
```

### Verified Test Categories (18 / 18 Passed):
- `test_rbac_and_security.py`:
  - `test_cryptography_and_timing_defense`: Bcrypt work factor 12 & constant-time dummy verify.
  - `test_jwt_claims_and_token_tampering`: PyJWT payload validation & signature tampering detection.
  - `test_login_success_and_cookie_generation`: Clean sanitized user payload and HttpOnly cookie issuance.
  - `test_login_generic_error_on_invalid_credentials`: OWASP-compliant enumeration prevention.
  - `test_logout_clears_cookie`: Cookie revocation & expiration header verification.
  - `test_rbac_admin_endpoint_isolation`: 401 unauthenticated, 403 doctor/ta forbidden, 200 admin allowed.
  - `test_rate_limiting_slowapi_enforcement`: SlowAPI 429 Too Many Requests enforcement.
- `test_crud_operations.py`:
  - `test_staff_crud_lifecycle`: Create, Read, Update, Delete for staff records.
  - `test_venue_crud_lifecycle`: Capacity, building, and venue type management.
  - `test_exam_session_crud_lifecycle`: Exam session scheduling & duration calculation.
- `test_optimizer.py`:
  - `test_optimizer_basic_hard_constraints`: Zero double-booking & blackout respect.
  - `test_optimizer_workload_balance`: Fair shift distribution across staff.
  - `test_optimizer_infeasible_inputs_graceful_handling`: Graceful error codes without crashes.
  - `test_optimizer_proctor_ratios_and_room_overlap_integrity`: Dynamic lab/hall ratios.
- `test_api_and_services.py`:
  - `test_auth_login_and_token`: End-to-end authentication API.
  - `test_auth_demo_switcher`: Multi-role persona switching.
  - `test_schedule_generation_and_matrix_api`: Full solver invocation and matrix serialization.
  - `test_document_exports`: Landscape Master PDF, personal slip PDF, and `.ics` generation.

---

## 📄 License & Academic Attribution
Developed for the Delta University Faculty Examination Committee. All rights reserved.

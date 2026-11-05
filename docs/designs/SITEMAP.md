# EGM Design Documentation Index

This directory maintains the formal specifications and architectural decisions for the **Exam Invigilation Management System** at Delta University for Science & Technology, following the Google Elephant-Goldfish Model (EGM) standards.

| Spec ID | Title | Status | Standards Satisfied | Target Scope |
| :--- | :--- | :--- | :--- | :--- |
| [`001`](./001-faculty-exam-scheduler.md) | **Automated Exam Invigilation Management System** | `Approved & Implemented` | Feature Spec, Heilmeier, Implementation Readiness | Core Backend, Optimization Solver, Frontend Portals |

## Document Governance
- All architectural decisions must satisfy the **Alternatives Rule** (documenting evaluated and rejected designs).
- Every major proposal must answer the **Heilmeier Catechism Questions** without jargon.
- All implementation task lists must satisfy the **Zero-Decision Rule** before coding begins.
- Drift between checked-in specifications and code is tracked via `/egm-drift-report`.

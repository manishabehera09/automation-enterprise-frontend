# SecureGate AI — Intelligent Enterprise Workflow & Visitor Management System

**GDG on Campus KIIT — Deploy or Die Hackathon (Track A: Business Process Automation)**

SecureGate AI automates enterprise visitor approvals, employee leave requests, and workplace complaints through AI-assisted prioritization while keeping human administrators and senior executives in complete control of final business decisions. Every action generates an immutable audit trail.

---

## 🌟 Core Product Principle

> **AI recommends. Humans decide. The system records everything.**

Every automated action is: **Visible → Explainable → Traceable → Auditable**.

---

## 🚀 Key Features & Role-Based Dashboards

### 1. Enterprise Landing Page
- Hero section with animated request processing visualization: `Request → AI Analysis → Human Review → Decision → Audit Trail`.
- Feature highlights, workflow breakdown, AI automation details, interactive FAQ, and dark/light glassmorphism theme switcher.

### 2. Security & Authentication
- **Role-Based Access Control (RBAC)** for 4 distinct roles: Visitor, Employee, Administrator, Senior Executive.
- **Custom Arithmetic CAPTCHA**: Enforces exact string formula input (e.g., entering `"4 + 5"` for the prompt `4 + 5` instead of `9`).
- **Demo OTP Mode**: 6-digit OTP passcode display on screen with a 60-second countdown timer and resend capability.

### 3. Visitor Dashboard
- Multi-step application form: Personal Info → Branch Selection (Bhubaneswar, Damanjodi, Angul, Corporate Office) → Host Employee Directory Search → Purpose Statement → Real-time `VisitorReasonAgent` AI Preview → Summary Check → Submission.
- Visual step-by-step request status timeline (`Application Submitted → AI Analysis Completed → Waiting for Administrator → Approved / Rejected`).
- Automatic generation of a professional **Visitor Approval PDF Pass** with embedded QR Verification ID.

### 4. Employee Dashboard
- **Leave Application Workflow**: Multi-type leaves (Casual, Sick, Emergency, Earned) with real-time `EmployeeRequestAgent` AI importance scoring (🔴 High, 🟠 Medium, 🟢 Low) and summary reasoning.
- **Workplace Complaint System**: Category selection (Infrastructure, IT, HR, Transport, Facilities, Security), location details, real-time `ComplaintAnalysisAgent` risk assessment, suggested department, and suggested resolution.
- Live status timeline tracking (`Submitted → AI Analyzed → Admin Reviewing → Solved OR Forwarded to Exec → Resolved`).

### 5. Administrator Dashboard
- **Visitor Requests Desk**: Priority filtering, AI analysis card inspection, and `[Approve]` (remarks) or `[Reject]` (mandatory reason required) actions.
- **Employee Leave Desk**: Approve / Reject leave requests with audit logging.
- **Complaint Resolution Desk**: Triage queue allowing Admin to either `[SOLVE]` (add resolution notes) OR `[FORWARD TO SENIOR EXECUTIVE]` (add escalation rationale).
- **Branch & Directory Management**: Manage company branches, department rosters, and employee designations.

### 6. Senior Executive Dashboard
- **Company Analytics**: Recharts interactive charts (Visitors per day/month, Branch & Dept breakdowns, Complaint distribution & resolution time).
- **Escalated Problems Desk**: Dedicated queue for complaints forwarded by Admin. Actions: `Take Over`, `Resolve`, `Send Back`, `Escalate`.
- **AI Company Insights Panel**: Aggregated operational management insights.

### 7. Audit Trail & Security Gate
- Searchable audit table displaying Timestamp, User, Role, Action, Entity ID, AI Recommendation, Human Decision, and Remarks.
- **Security Access Desk**: Camera/Upload QR Code scanner to verify visitor passes at entry points.

---

## 🛠️ Technical Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Framer Motion, Recharts, jsPDF, qrcode.react.
- **Backend API**: Node.js, Express.js.
- **ML Integration**: Python Flask REST API (`POST /api/ml/*`) with local client-side heuristic fallback.
- **Testing**: Vitest + React Testing Library, Playwright E2E tests.

---

## 🔌 Flask REST API Endpoints (ML Backend Integration)

| Endpoint | Method | Request Payload | Description |
| :--- | :--- | :--- | :--- |
| `/api/ml/analyze-visitor-reason` | `POST` | `{ visitorName, companyName, hostEmployeeName, branch, visitReason }` | Visitor purpose importance analysis |
| `/api/ml/analyze-leave-request` | `POST` | `{ employeeId, leaveType, startDate, endDate, totalDays, reason }` | Employee leave priority assessment |
| `/api/ml/analyze-complaint` | `POST` | `{ category, subject, description, location }` | Complaint triage & department routing |
| `/api/ml/analytics-insights` | `GET` | N/A | Aggregate company insights |

---

## ⚡ 3-Minute Hackathon Demo Credentials

Use these instant preset credentials on the Auth Portal:
- **Administrator**: `admin@securegate.ai` / `Admin@12345`
- **Senior Executive**: `exec@securegate.ai` / `Exec@12345`
- **Employee**: `employee@securegate.ai` / `Employee@12345`
- **Visitor**: `visitor@securegate.ai` / `Visitor@12345`

---

## 🏃 Quick Start

```bash
# 1. Install workspace dependencies
npm install

# 2. Build production frontend
cd frontend && npm run build

# 3. Start development server
cd .. && npm run dev
```

Open `http://localhost:5173` in your browser.

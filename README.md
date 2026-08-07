# SecureGate AI - Enterprise AI-Powered Visitor Management Platform

SecureGate AI is an enterprise-ready Visitor Management & Business Process Automation system. It automates onboarding, OCR scanning, risk validation, dynamic conflict scheduling, and real-time alerts through an orchestrated team of 6 AI Agents.

---

## Technical Stack
- **Frontend**: React (TypeScript), Tailwind CSS, Framer Motion (for premium animations), Chart.js (for analytics dashboard).
- **Backend**: Node.js, Express.js.
- **Database**: Firebase Firestore (Production) / Local in-memory JSON db (Offline Demo Mode fallback).
- **AI Engines**: Google Gemini API, Google Cloud Vision OCR (Production) / Mock Local Gemini Agents (Demo Mode fallback).

---

## 3-Minute Demo Guide

### Preset Review Credentials
You can log in to any of the 4 roles instantly using these preset credentials (avoiding manual OTP verification during demo checks):
- **Administrator**: `admin@securegate.ai` / `Admin@12345`
- **Senior Executive**: `exec@securegate.ai` / `Exec@12345`
- **Employee**: `employee@securegate.ai` / `Employee@12345`
- **Visitor**: `visitor@securegate.ai` / `Visitor@12345`

### Walkthrough Flow
1. **Visit Landing Page**: Go to the login page and choose **Visitor Portal**. Log in with the preset credentials or sign up by completing the CAPTCHA and OTP demo checkpoints.
2. **Book a Visit**: In the Visitor Dashboard, click **Book Visit**. Upload a government ID image and fill details. The **Document Verification Agent** runs mock/real OCR and parses details, while the **Risk Analysis Agent** evaluates safety scores.
3. **Review AI Recommendations (Employee Portal)**: Log out and sign in as an **Employee**. Open the request, view the AI audit trails, risk ranking (Low/Med/High), room allocation proposal, and click **Approve**.
4. **Inspect Audits & System Control (Admin Portal)**: Sign in as **Administrator**. Review the overall system analytics charts, search the immutable audit logs, check the blacklist/whitelist controls, and view the system-wide visitor counts.
5. **Entry Gate Check-in (Security Portal)**: Log in or switch to the **Security Dashboard**. Scan/verify the Visitor pass. Complete check-in and check-out tracking, checking for changes to the visitor logs.

---

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm (v9 or higher)

### Setup & Installation
1. Clone the repository.
2. Run the bootstrap command at the workspace root to install all workspace dependencies:
   ```bash
   npm run bootstrap
   ```
3. Create a `.env` file inside the `backend` folder (you can copy `.env.example`). Keep credentials empty to run in offline **Demo Mode** out of the box.
4. Launch both frontend and backend development servers concurrently:
   ```bash
   npm run dev
   ```
5. Open your browser to `http://localhost:5173`. The backend will be running on `http://localhost:5000`.

---

## Running with Docker
To build and spin up the complete application using Docker:
```bash
docker-compose up --build
```
This maps the client port to `5173` and server port to `5000` inside your docker container.

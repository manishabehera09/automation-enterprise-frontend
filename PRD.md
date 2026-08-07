# Product Requirements Document (PRD) - SecureGate AI

## 1. Overview
SecureGate AI is an enterprise-grade AI-powered Visitor Management & Business Process Automation platform. It completely automates the visitor registration, verification, risk assessment, and scheduling pipeline while strictly keeping humans (Employees, Executives, Admins) in the approval loop.

## 2. Target Roles & Dashboards
The platform segregates access based on four key roles, each with custom onboarding and dashboards:
1. **Visitor**: Can book a visit, upload ID & documents, view AI OCR results, track booking status, view notifications, chat with the AI assistant, and download the approved QR Pass.
2. **Employee**: Can view today's visitor schedule, check pending requests, review AI risk and approval recommendations, and take action (Approve, Reject, Request More Info, Reschedule).
3. **Senior Executive**: Focuses on escalated or high-risk requests and priorities, reviews department analytics, and views monthly/quarterly reports.
4. **Administrator**: Master role management, system/AI confidence configurations, emergency override access, blacklists/whitelists, audit logs viewer, and export tools.
5. **Security Gate Portal**: Specifically for security staff to scan QR passes, verify visitor details (photo, vehicle, gadgets), log entry/exit events, and trigger emergency lockdowns.

## 3. Key Workflows & Special Features
- **Multi-Step Signup**: Personal details -> Arithmetic CAPTCHA -> Email OTP -> Mobile OTP.
- **Custom Arithmetic CAPTCHA**: Randomly generated basic equations (using +, -, ×) with random spaces. Must be entered as the formula itself (e.g., `12+6`), NOT the result (e.g., `18`).
- **OTP Verification**: Dynamic 6-digit OTPs displayed on screen in Demo Mode. Supports 60-second resend limits.
- **Secure Logins**: Session timeout, account locking after 5 consecutive failures, and MFA Email OTP.
- **AI Agent Suite**: 6 autonomous agents coordinate document parsing, risk ranking, room allocation, notifications, and auditing.

## 4. User Stories & Acceptance Criteria

### User Story 1: Custom CAPTCHA Protection
*As a security administrator, I want a custom arithmetic formula CAPTCHA so that standard automated bots cannot easily sign up or log in, without relying on external services like reCAPTCHA.*
- **Acceptance Criteria**:
  - The CAPTCHA generates simple random math expressions using numbers (1-20) and operators (`+`, `-`, `*` displayed as `×`).
  - Spacing in the display is randomized.
  - The user must enter the exact expression without spaces (e.g. for `14 + 5` they must enter `14+5` and NOT `19`).
  - Entering the mathematical result (e.g. `19`) fails validation.
  - Failing the CAPTCHA triggers an immediate regeneration of a new expression.

### User Story 2: Visitor Onboarding & Document OCR
*As a visitor, I want to upload my government ID and photo, so that AI can automatically extract my details and speed up my check-in process.*
- **Acceptance Criteria**:
  - Visitor uploads a government ID (Aadhaar or PAN card).
  - The Document Verification Agent runs OCR to extract Name, Document ID, and expiration date.
  - If a duplicate document or fake signature pattern is identified, it marks it for manual verification.

### User Story 3: Explanable AI Risk Analysis
*As an approving employee, I want to see an AI risk analysis score and description so that I can make a fast, informed approval decision.*
- **Acceptance Criteria**:
  - The Risk Analysis Agent assigns a Risk Score (Low, Medium, High).
  - The recommendation provides a "Reason", "Confidence Score", and "Evidence Used" section.
  - The analysis must be displayed side-by-side with the approval buttons.

### User Story 4: QR Pass Scan & Check-in
*As a security guard, I want to scan a visitor's QR code at the entrance so that I can instantly verify their credentials and log their check-in.*
- **Acceptance Criteria**:
  - Scanner decodes the visitor ID and checks approval status.
  - Displays visitor photo, vehicle registration, and approved meeting room.
  - Actioning Check-in logs entry time and sets the status to "Checked-In" in the Audit logs.

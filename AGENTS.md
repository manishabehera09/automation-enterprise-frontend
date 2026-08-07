# AI Agents Specification - SecureGate AI

SecureGate AI implements a multi-agent architectural pipeline to handle separate phases of the visitor check-in process. Every agent action is logged explicitly to the audit database, ensuring full trace transparency.

---

## Agent 1: Document Verification Agent (OCR & Check)
- **Role**: Parses uploaded IDs, extracts text, performs validation, and flags duplicates.
- **Input**:
  - Image of government ID (Aadhaar/PAN card)
  - Pre-entered Visitor registration details (Name, ID number)
- **Execution Flow**:
  1. Performs Optical Character Recognition (OCR) to extract strings.
  2. Compares extracted name with the visitor's profile name.
  3. Verifies format checksums (Aadhaar 12-digit format, PAN regex).
  4. Scans database for duplicate document numbers.
- **Output Format**:
  ```json
  {
    "documentVerified": true,
    "extractedName": "JOHN DOE",
    "extractedId": "1234-5678-9012",
    "confidenceScore": 0.98,
    "issues": []
  }
  ```

---

## Agent 2: Risk Analysis Agent
- **Role**: Computes risk levels (Low, Medium, High) based on company profiles, blacklist records, safety logs, and time of booking.
- **Input**:
  - Visitor details, company name, purpose of visit.
  - Historical records, incident reports, and system blacklist.
- **Execution Flow**:
  1. Checks if company or visitor name matches the administrator-curated blacklist.
  2. Analyzes timing (e.g. late night bookings increase risk rating).
  3. Formulates a structured explanation of the risk vector.
- **Output Format**:
  ```json
  {
    "riskLevel": "low | medium | high",
    "confidence": 0.92,
    "reasoning": "Visitor profile has no negative records. The hosting organization is an active partner.",
    "evidenceUsed": "No matching record in blacklist db. Schedule matches general working hours."
  }
  ```

---

## Agent 3: Approval Recommendation Agent
- **Role**: Suggests actions (Approve, Reject, Escalate) to the Human-in-the-Loop.
- **Input**:
  - Output from Document Verification (Agent 1) and Risk Analysis (Agent 2).
  - Department and designations of meeting host.
- **Execution Flow**:
  1. If Risk Level is "High", recommends "Escalate" or "Reject".
  2. Synthesizes inputs into a final score (0.0 to 1.0).
  3. Drafts a markdown breakdown summarizing recommendation rationale.
- **Output Format**:
  ```json
  {
    "recommendation": "approve | reject | escalate",
    "confidenceScore": 0.95,
    "evidence": "Document OCR is verified and Risk Level is Low.",
    "agentDescription": "Approval Recommendation Agent v1.2"
  }
  ```

---

## Agent 4: Scheduling Agent
- **Role**: Detects schedule conflicts and automatically allocates meeting rooms.
- **Input**:
  - Requested date/time, duration, host employee ID, and department.
- **Execution Flow**:
  1. Checks host calendar for existing meetings.
  2. Scans conference room occupancy lists.
  3. Suggests alternative times if conflicts exist.
- **Output Format**:
  ```json
  {
    "roomAllocated": "Conference Room B",
    "conflictDetected": false,
    "alternativeTimes": []
  }
  ```

---

## Agent 5: Notification Agent
- **Role**: Broadcasts system-wide alerts to respective actors.
- **Input**:
  - Message content, channels (Email, SMS, WhatsApp, Push), target role.
- **Execution Flow**:
  1. Receives signals from the core controller.
  2. Formulates clean notifications.
  3. In Demo Mode, appends notifications to a system-wide queue rendered on screen.
- **Output Format**:
  ```json
  {
    "sentChannels": ["email", "sms"],
    "deliveryStatus": "delivered",
    "timestamp": "2026-08-07T08:12:00Z"
  }
  ```

---

## Agent 6: Audit Agent
- **Role**: Creates trace logs of all database states, human overrides, and AI assertions.
- **Input**:
  - Transaction payloads, previous database status, and current user headers (IP, User Agent).
- **Execution Flow**:
  1. Intercepts transaction updates.
  2. Combines metadata (IP, OS, browser).
  3. Persists the log record to the immutable database.
- **Output**: Writes directly to `audit_logs` database collection.

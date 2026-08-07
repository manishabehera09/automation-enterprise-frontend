# Custom AI Agents & Skill Documentation — SecureGate AI

This document provides detailed specifications for the **5 Custom AI Agents** and the **Custom AI Skill** (`skills/business-workflow-analysis/SKILL.md`) implemented in SecureGate AI for the GDG on Campus KIIT Hackathon.

---

## 1. Core Principle: AI Recommends. Humans Decide. Audit Logs Everything.

SecureGate AI strictly enforces human-in-the-loop decision making. AI agents analyze input text, evaluate urgency, and calculate importance scores, but **never silently execute final business approvals, rejections, or ticket resolutions**.

---

## 2. Custom AI Agents Specification

### Agent 1: VisitorReasonAgent
- **Role**: Analyzes visitor purpose, branch selection, and meeting urgency to assign an importance level and markdown explanation.
- **Input**: `visitorName`, `companyName`, `hostEmployeeName`, `branch`, `visitReason`.
- **Output**:
  ```json
  {
    "importance": "HIGH | MEDIUM | LOW",
    "confidence": 0.92,
    "summary": "Urgent contract negotiation with executive host.",
    "reasoning": ["Contains commercial urgency keywords", "Matches priority visitor category"],
    "recommendedAction": "PRIORITIZE_ADMIN_APPROVAL",
    "requiresHumanApproval": true
  }
  ```

### Agent 2: EmployeeRequestAgent
- **Role**: Evaluates employee leave applications (Casual, Sick, Emergency, Earned) for urgency and time-sensitivity.
- **Input**: `employeeId`, `leaveType`, `startDate`, `endDate`, `totalDays`, `reason`.
- **Output**:
  ```json
  {
    "importance": "HIGH | MEDIUM | LOW",
    "confidence": 0.95,
    "summary": "Medical emergency requiring immediate sick leave approval.",
    "reasoning": ["Documented acute medical condition", "Complies with emergency HR leave policy"],
    "recommendedAction": "EXPEDITE_HR_APPROVAL",
    "requiresHumanApproval": true
  }
  ```

### Agent 3: ComplaintAnalysisAgent
- **Role**: Triages workplace complaints across Infrastructure, IT, HR, Transport, Facilities, and Security.
- **Input**: `category`, `subject`, `description`, `location`.
- **Output**:
  ```json
  {
    "importance": "CRITICAL | HIGH | MEDIUM | LOW",
    "confidence": 0.97,
    "summary": "Critical server room temperature outage risking hardware uptime.",
    "reasoning": ["High-hazard operational risk detected", "Hardware integrity threat"],
    "suggestedDepartment": "Facilities Management",
    "suggestedAction": "Dispatch technician & notify Senior Executive desk",
    "requiresHumanApproval": true
  }
  ```

### Agent 4: CompanyAnalyticsAgent
- **Role**: Synthesizes system-wide metrics (visitor traffic, leave trends, unresolved complaints) into management insights.
- **Input**: Aggregated database statistics across branches and departments.
- **Output**:
  ```json
  {
    "insights": [
      {
        "category": "Complaints",
        "insight": "IT Department recorded a 35% spike in tickets following network maintenance.",
        "severity": "HIGH"
      }
    ]
  }
  ```

### Agent 5: AuditAgent
- **Role**: Intercepts every system event and writes an immutable audit record containing state transitions and human remarks.
- **Input**: `timestamp`, `userId`, `role`, `action`, `entityId`, `previousStatus`, `newStatus`, `aiRecommendation`, `humanDecision`, `remarks`.
- **Output**: Persisted entry in `auditLogs` database collection.

---

## 3. Custom AI Skill: Business Workflow Analysis

Located at [`skills/business-workflow-analysis/SKILL.md`](file:///d:/KIIT/Documents/gdg_event/skills/business-workflow-analysis/SKILL.md).

### Skill Responsibilities
1. Parses structured request payloads.
2. Applies vector-based keyword, category, and time-sensitivity analysis.
3. Generates structured JSON responses with `importance`, `summary`, `reasoning`, and `recommendedAction`.
4. Enforces `requiresHumanApproval = true` across all evaluation paths.
5. Invokes `AuditAgent` to record the AI analysis assertion.

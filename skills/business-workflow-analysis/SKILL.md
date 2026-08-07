---
name: business-workflow-analysis
description: Analyzes visitor visit reasons, employee leave requests, and workplace complaints, assigning importance levels (CRITICAL, HIGH, MEDIUM, LOW), structured evidence, and recommendations while keeping human approval mandatory.
---

# Business Workflow Analysis Skill — SecureGate AI

This skill standardizes how SecureGate AI agents analyze inbound business requests (Visitor requests, Employee leave applications, and Workplace complaints) before presenting them to human decision-makers.

---

## Operating Principles

1. **Structured Input Processing**: Accepts structured JSON containing request context, identity details, and purpose statements.
2. **Deterministic Risk & Importance Assessment**: Evaluates text intent, operational urgency, security keywords, and time-sensitivity.
3. **Structured Evidence Generation**: Provides explicit, bulleted rationale for why an importance score was assigned.
4. **Action Recommendation**: Suggests routing, priority queues, or department assignments without making terminal decisions.
5. **Strict Human-in-the-Loop Safeguard**: `requiresHumanApproval` MUST always be `true`. AI never automatically approves, rejects, solves, or closes requests.
6. **Audit Traceability**: Emits a structured log payload to the `AuditAgent` for permanent ledger persistence.

---

## Input Payload Specification

```json
{
  "requestType": "VISITOR | LEAVE | COMPLAINT",
  "entityId": "REQ-1001",
  "subject": "Urgent vendor contract discussion",
  "details": {
    "visitorName": "Jane Doe",
    "company": "Acme Industries",
    "hostEmployee": "Alex Smith",
    "branch": "Bhubaneswar",
    "reason": "I need to align Q3 procurement contract terms with executive leadership."
  }
}
```

---

## Execution Logic & Evaluation Vectors

### Vector 1: Keyword & Intent Analysis
- **Critical / High Urgency Keywords**: `emergency`, `hospital`, `fever`, `server down`, `fire`, `harassment`, `security breach`, `urgent contract`, `audit`.
- **Medium Urgency Keywords**: `meeting`, `proposal`, `casual`, `maintenance`, `ac unit`, `interview`.
- **Low Urgency Keywords**: `informational`, `routine`, `general visit`.

### Vector 2: Operational Impact Scoring
- Computes confidence score between `0.80` and `0.99`.
- Maps category (IT, HR, Facilities, Infrastructure, Safety) to suggested department routing.

---

## Output Response Specification

```json
{
  "importance": "HIGH",
  "confidence": 0.94,
  "summary": "Urgent commercial negotiation requiring prompt administrator action.",
  "reasoning": [
    "Contains time-sensitive procurement contract keywords.",
    "Target host employee belongs to executive leadership."
  ],
  "recommendedAction": "PRIORITIZE_ADMIN_APPROVAL",
  "suggestedDepartment": "Executive Operations",
  "suggestedAction": "Review schedule and issue visitor approval pass.",
  "requiresHumanApproval": true
}
```
